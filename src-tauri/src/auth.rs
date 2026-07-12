use std::{env, fs, path::PathBuf};

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use serde::Deserialize;
use serde_json::Value;

use crate::models::UsageError;

#[derive(Debug)]
pub struct CodexCredentials {
    pub access_token: String,
    pub account_id: Option<String>,
    pub email: Option<String>,
}

#[derive(Deserialize)]
struct AuthFile {
    tokens: Option<AuthTokens>,
}

#[derive(Deserialize)]
struct AuthTokens {
    access_token: Option<String>,
    id_token: Option<String>,
    account_id: Option<String>,
}

pub fn read_credentials() -> Result<CodexCredentials, UsageError> {
    let path = auth_path()?;
    let contents = fs::read_to_string(&path).map_err(|error| UsageError {
        code: "auth-not-found".into(),
        message: format!("未找到 Codex 登录凭据，请先运行 `codex login`（{}）", error),
    })?;

    parse_credentials(&contents)
}

fn parse_credentials(contents: &str) -> Result<CodexCredentials, UsageError> {
    let auth: AuthFile = serde_json::from_str(contents).map_err(|_| UsageError {
        code: "auth-invalid".into(),
        message: "Codex auth.json 无法解析，请重新执行 `codex login`".into(),
    })?;
    let tokens = auth.tokens.ok_or_else(|| UsageError {
        code: "auth-missing-token".into(),
        message: "Codex auth.json 中没有 OAuth 登录信息".into(),
    })?;
    let access_token = tokens
        .access_token
        .filter(|token| !token.trim().is_empty())
        .ok_or_else(|| UsageError {
            code: "auth-missing-token".into(),
            message: "Codex auth.json 中没有 access token，请重新登录".into(),
        })?;

    let email = tokens
        .id_token
        .as_deref()
        .and_then(jwt_payload)
        .and_then(find_email)
        .or_else(|| jwt_payload(&access_token).and_then(find_email));

    Ok(CodexCredentials {
        access_token,
        account_id: tokens.account_id,
        email,
    })
}

fn auth_path() -> Result<PathBuf, UsageError> {
    if let Some(codex_home) = env::var_os("CODEX_HOME") {
        return Ok(PathBuf::from(codex_home).join("auth.json"));
    }

    env::var_os("HOME")
        .map(PathBuf::from)
        .map(|home| home.join(".codex/auth.json"))
        .ok_or_else(|| UsageError {
            code: "home-not-found".into(),
            message: "无法确定当前用户目录".into(),
        })
}

fn jwt_payload(token: &str) -> Option<Value> {
    let payload = token.split('.').nth(1)?;
    let bytes = URL_SAFE_NO_PAD.decode(payload).ok()?;
    serde_json::from_slice(&bytes).ok()
}

fn find_email(payload: Value) -> Option<String> {
    payload
        .get("email")
        .and_then(Value::as_str)
        .or_else(|| {
            payload
                .get("https://api.openai.com/profile")
                .and_then(|profile| profile.get("email"))
                .and_then(Value::as_str)
        })
        .map(str::to_owned)
}

#[cfg(test)]
mod tests {
    use super::{find_email, jwt_payload, parse_credentials};
    use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};

    #[test]
    fn reads_email_from_jwt_payload() {
        let payload = URL_SAFE_NO_PAD.encode(r#"{"email":"fox@example.com"}"#);
        let token = format!("header.{payload}.signature");
        let email = jwt_payload(&token).and_then(find_email);

        assert_eq!(email.as_deref(), Some("fox@example.com"));
    }

    #[test]
    fn rejects_missing_oauth_tokens() {
        let error = parse_credentials(r#"{"tokens":{}}"#).expect_err("empty tokens should fail");

        assert_eq!(error.code, "auth-missing-token");
    }

    #[test]
    fn rejects_invalid_auth_json() {
        let error = parse_credentials("not-json").expect_err("invalid JSON should fail");

        assert_eq!(error.code, "auth-invalid");
    }
}
