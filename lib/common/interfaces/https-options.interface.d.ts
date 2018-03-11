export interface HttpsOptions {
    pfx?: any;
    key?: any;
    passphrase?: string;
    cert?: any;
    ca?: any;
    crl?: any;
    ciphers?: string;
    honorCipherOrder?: boolean;
    requestCert?: boolean;
    rejectUnauthorized?: boolean;
    NPNProtocols?: any;
    SNICallback?: (servername: string, cb: (err: Error, ctx: any) => any) => any;
}
