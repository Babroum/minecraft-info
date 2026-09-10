use reqwest::Client;
use serde::{Deserialize, Serialize};


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthResponse {
    pub success: Option<bool>,
    pub username: Option<String>,
    pub token: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VerifyResponse {
    pub valid: Option<bool>,
    pub username: Option<String>,
    pub error: Option<String>,
}

pub fn get_api_base_url(custom_url: Option<&str>) -> String {
    if let Some(u) = custom_url.filter(|s| !s.trim().is_empty()) {
        return crate::sync::normalize_url(u);
    }
    if let Ok(env_url) = std::env::var("LAUNCHER_MODS_URL") {
        let trimmed = env_url.trim();
        if !trimmed.is_empty() {
            return crate::sync::normalize_url(trimmed);
        }
    }
    crate::sync::DEFAULT_MODS_URL.to_string()
}

/// Build an HTTPS client that accepts self-signed certificates
fn build_client() -> Result<Client, String> {
    Client::builder()
        .user_agent("ThirdWorld-Launcher/0.1.0")
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| format!("Erreur création client HTTP: {}", e))
}

pub async fn register(username: &str, password: &str, custom_url: Option<&str>) -> Result<AuthResponse, String> {
    let client = build_client()?;
    let base_url = get_api_base_url(custom_url);
    let url = format!("{}/auth/register", base_url);

    let resp = client
        .post(&url)
        .json(&serde_json::json!({
            "username": username,
            "password": password,
        }))
        .send()
        .await
        .map_err(|e| format!("Impossible de contacter le serveur d'authentification: {}", e))?;

    let status = resp.status();
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Réponse invalide du serveur: {}", e))?;

    if status.is_success() {
        Ok(AuthResponse {
            success: Some(true),
            username: body["username"].as_str().map(String::from),
            token: body["token"].as_str().map(String::from),
            error: None,
        })
    } else {
        let error_msg = body["error"]
            .as_str()
            .unwrap_or("Erreur inconnue")
            .to_string();
        Err(error_msg)
    }
}

pub async fn login(username: &str, password: &str, custom_url: Option<&str>) -> Result<AuthResponse, String> {
    let client = build_client()?;
    let base_url = get_api_base_url(custom_url);
    let url = format!("{}/auth/login", base_url);

    let resp = client
        .post(&url)
        .json(&serde_json::json!({
            "username": username,
            "password": password,
        }))
        .send()
        .await
        .map_err(|e| format!("Impossible de contacter le serveur d'authentification: {}", e))?;

    let status = resp.status();
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Réponse invalide du serveur: {}", e))?;

    if status.is_success() {
        Ok(AuthResponse {
            success: Some(true),
            username: body["username"].as_str().map(String::from),
            token: body["token"].as_str().map(String::from),
            error: None,
        })
    } else {
        let error_msg = body["error"]
            .as_str()
            .unwrap_or("Pseudo ou mot de passe incorrect.")
            .to_string();
        Err(error_msg)
    }
}

pub async fn verify_token(token: &str, custom_url: Option<&str>) -> Result<VerifyResponse, String> {
    let client = build_client()?;
    let base_url = get_api_base_url(custom_url);
    let url = format!("{}/auth/verify?token={}", base_url, token);

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Impossible de contacter le serveur d'authentification: {}", e))?;

    let status = resp.status();
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Réponse invalide du serveur: {}", e))?;

    if status.is_success() {
        Ok(VerifyResponse {
            valid: Some(true),
            username: body["username"].as_str().map(String::from),
            error: None,
        })
    } else {
        let error_msg = body["error"]
            .as_str()
            .unwrap_or("Token invalide ou expiré.")
            .to_string();
        Err(error_msg)
    }
}
