use serde::ser::SerializeStruct;

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    NotFound(String),
    #[error("{0}")]
    Validation(String),
    #[error("erro de banco de dados: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("erro de E/S: {0}")]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    Internal(String),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut s = serializer.serialize_struct("AppError", 2)?;
        let kind = match self {
            AppError::NotFound(_) => "not_found",
            AppError::Validation(_) => "validation",
            AppError::Database(_) => "database",
            AppError::Io(_) => "io",
            AppError::Internal(_) => "internal",
        };
        s.serialize_field("kind", kind)?;
        s.serialize_field("message", &self.to_string())?;
        s.end()
    }
}

pub fn not_found(what: &str) -> AppError {
    AppError::NotFound(format!("{what} não encontrado"))
}

pub fn validation(msg: impl Into<String>) -> AppError {
    AppError::Validation(msg.into())
}
