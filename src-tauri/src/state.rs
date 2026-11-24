use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::Connection;

use crate::error::{AppError, AppResult};

fn poisoned() -> AppError {
    AppError::Internal("lock do banco de dados envenenado".to_string())
}

fn unavailable() -> AppError {
    AppError::Internal("banco de dados temporariamente indisponível".to_string())
}

/// Estado global da aplicação: conexão com o banco + caminho do arquivo.
///
/// A conexão é `Option` para permitir o fechamento seguro durante a
/// restauração de backups (substituição do arquivo SQLite).
pub struct AppState {
    db: Mutex<Option<Connection>>,
    pub db_path: PathBuf,
}

impl AppState {
    pub fn new(conn: Connection, db_path: PathBuf) -> Self {
        Self {
            db: Mutex::new(Some(conn)),
            db_path,
        }
    }

    /// Executa `f` com a conexão, segurando o lock durante a operação.
    pub fn with_conn<T>(&self, f: impl FnOnce(&Connection) -> AppResult<T>) -> AppResult<T> {
        let guard = self.db.lock().map_err(|_| poisoned())?;
        let conn = guard.as_ref().ok_or_else(unavailable)?;
        f(conn)
    }

    /// Fecha a conexão atual (para restauração de backup).
    pub fn take_conn(&self) -> AppResult<()> {
        let mut guard = self.db.lock().map_err(|_| poisoned())?;
        *guard = None;
        Ok(())
    }

    /// Substitui a conexão (após restauração de backup).
    pub fn set_conn(&self, conn: Connection) -> AppResult<()> {
        let mut guard = self.db.lock().map_err(|_| poisoned())?;
        *guard = Some(conn);
        Ok(())
    }
}

/// Estado do atualizador: guarda a atualização verificada
/// entre os comandos `updater_check` e `updater_download_install`.
pub struct UpdaterState {
    pub pending: Mutex<Option<tauri_plugin_updater::Update>>,
}

impl Default for UpdaterState {
    fn default() -> Self {
        Self {
            pending: Mutex::new(None),
        }
    }
}
