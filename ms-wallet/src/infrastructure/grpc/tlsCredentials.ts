import * as grpc from '@grpc/grpc-js';
import * as fs from 'fs';
import * as path from 'path';

const CERTS_DIR = fs.existsSync('/certs/ca-cert.pem') 
  ? '/certs' 
  : path.resolve(process.cwd(), 'certs');

export function createServerCredentials(): grpc.ServerCredentials {
  const certsPath = CERTS_DIR;
  
  try {
    const caCert = fs.readFileSync(path.join(certsPath, 'ca-cert.pem'));
    const serverCert = fs.readFileSync(path.join(certsPath, 'server-cert.pem'));
    const serverKey = fs.readFileSync(path.join(certsPath, 'server-key.pem'));

    return grpc.ServerCredentials.createSsl(
      caCert,
      [
        {
          cert_chain: serverCert,
          private_key: serverKey,
        },
      ],
      true // checkClientCertificate - enforce mTLS
    );
  } catch (error) {
    throw new Error(`Failed to load TLS certificates: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function createClientCredentials(): grpc.ChannelCredentials {
  const certsPath = path.resolve(__dirname, '../../../../../certs');
  
  try {
    const caCert = fs.readFileSync(path.join(certsPath, 'ca-cert.pem'));
    const clientCert = fs.readFileSync(path.join(certsPath, 'client-cert.pem'));
    const clientKey = fs.readFileSync(path.join(certsPath, 'client-key.pem'));

    return grpc.credentials.createSsl(caCert, clientKey, clientCert);
  } catch (error) {
    throw new Error(`Failed to load TLS certificates: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
