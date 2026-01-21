# SSL/TLS Certificates for gRPC

This directory contains SSL certificates for mutual TLS (mTLS) authentication between microservices.

## Files
- `ca-cert.pem` / `ca-key.pem`: Certificate Authority (self-signed for dev/test)
- `server-cert.pem` / `server-key.pem`: Server certificate for ms-wallet gRPC
- `client-cert.pem` / `client-key.pem`: Client certificate for ms-users

## Development vs Production
**Development/Test:**
- Self-signed certificates (current setup)
- CA, server, and client keys are stored in repo for convenience
- Valid for 365 days

**Production:**
- Use certificates from a trusted CA (e.g., Let's Encrypt, corporate CA)
- Store private keys in secure vault (Vault, AWS Secrets Manager, etc.)
- Mount certificates as Kubernetes secrets or Docker secrets
- Rotate certificates before expiration

## Regenerating Certificates
If certificates expire or need rotation:

```bash
# 1. Generate CA
openssl req -x509 -newkey rsa:4096 -keyout certs/ca-key.pem -out certs/ca-cert.pem -days 365 -nodes -subj "/C=BR/ST=SP/L=SaoPaulo/O=WalletNodeMS/CN=CA"

# 2. Generate server certificate
openssl req -newkey rsa:4096 -keyout certs/server-key.pem -out certs/server-req.pem -nodes -subj "/C=BR/ST=SP/L=SaoPaulo/O=WalletNodeMS/CN=ms-wallet"
openssl x509 -req -in certs/server-req.pem -CA certs/ca-cert.pem -CAkey certs/ca-key.pem -CAcreateserial -out certs/server-cert.pem -days 365 -sha256

# 3. Generate client certificate
openssl req -newkey rsa:4096 -keyout certs/client-key.pem -out certs/client-req.pem -nodes -subj "/C=BR/ST=SP/L=SaoPaulo/O=WalletNodeMS/CN=ms-users"
openssl x509 -req -in certs/client-req.pem -CA certs/ca-cert.pem -CAkey certs/ca-key.pem -CAcreateserial -out certs/client-cert.pem -days 365 -sha256
```

## Verification
Check certificate details:
```bash
openssl x509 -in certs/server-cert.pem -text -noout
openssl x509 -in certs/client-cert.pem -text -noout
```

Verify certificate against CA:
```bash
openssl verify -CAfile certs/ca-cert.pem certs/server-cert.pem
openssl verify -CAfile certs/ca-cert.pem certs/client-cert.pem
```
