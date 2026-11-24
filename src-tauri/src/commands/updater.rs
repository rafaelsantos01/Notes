use tauri::{Emitter, State};
use tauri_plugin_updater::UpdaterExt;

use crate::error::{validation, AppResult};
use crate::models::UpdateInfo;
use crate::repo;
use crate::state::{AppState, UpdaterState};

/// Versão atual do aplicativo.
#[tauri::command]
pub fn app_get_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

/// Verifica atualizações no endpoint configurado (setting `updaterEndpoint`).
/// Token opcional em `updaterToken` (para repos privados).
/// A atualização encontrada fica guardada para o comando de instalação.
#[tauri::command]
pub async fn updater_check(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    updater_state: State<'_, UpdaterState>,
) -> AppResult<Option<UpdateInfo>> {
    let (endpoint, token) = state.with_conn(|conn| {
        let endpoint = repo::settings::get(conn, "updaterEndpoint")?.ok_or_else(|| {
            validation("Nenhuma fonte de atualização configurada. Defina a URL em Configurações.")
        })?;
        let token = repo::settings::get(conn, "updaterToken")?.unwrap_or_default();
        Ok::<_, crate::error::AppError>((endpoint, token))
    })?;

    let url = endpoint
        .parse()
        .map_err(|e| validation(format!("URL de atualização inválida: {e}")))?;

    let mut builder = app.updater_builder().endpoints(vec![url])?;
    if !token.trim().is_empty() {
        builder = builder.header("Authorization", format!("Bearer {}", token.trim()))?;
    }
    let updater = builder.build()?;

    match updater.check().await? {
        Some(update) => {
            let info = UpdateInfo {
                version: update.version.clone(),
                notes: update.body.clone().unwrap_or_default(),
                date: update.date.map(|d| d.to_string()),
            };
            *updater_state.pending.lock().map_err(|_| crate::error::AppError::Internal("lock do updater envenenado".into()))? = Some(update);
            Ok(Some(info))
        }
        None => {
            if let Ok(mut guard) = updater_state.pending.lock() {
                *guard = None;
            }
            Ok(None)
        }
    }
}

/// Baixa e instala a atualização verificada.
/// Emite eventos `updater://progress` com o andamento do download.
/// Observação: no Windows a instalação reinicia o aplicativo.
#[tauri::command]
pub async fn updater_download_install(
    app: tauri::AppHandle,
    updater_state: State<'_, UpdaterState>,
) -> AppResult<()> {
    let update = updater_state
        .pending
        .lock()
        .map_err(|_| crate::error::AppError::Internal("lock do updater envenenado".into()))?
        .take()
        .ok_or_else(|| validation("Verifique as atualizações antes de instalar."))?;

    let _ = app.emit(
        "updater://progress",
        serde_json::json!({ "event": "started" }),
    );

    update
        .download_and_install(
            |downloaded, total| {
                let _ = app.emit(
                    "updater://progress",
                    serde_json::json!({
                        "event": "progress",
                        "downloaded": downloaded as u64,
                        "total": total.map(|t| t as u64),
                    }),
                );
            },
            || {
                let _ = app.emit(
                    "updater://progress",
                    serde_json::json!({ "event": "finished" }),
                );
            },
        )
        .await?;

    Ok(())
}
