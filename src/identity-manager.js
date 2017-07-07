'use strict';
const tls = require('tls');
const pem = require('pem');
const fs = require('fs');
const async = require('async');

class IdentityManager {
    constructor() {
        this.verbose = false;
        this.key = undefined;
        this.cert = undefined;
        this.caCert = undefined;
        this.caKey = undefined;
        this.certificates = {};
    }

    init(options, callback) {
        const that = this;
        this.verbose = options['verbose'];
        const readFile = (optionsKey, thatKey, cb) => {
            fs.readFile(options[optionsKey], (err, data) => {
                if (err) return cb(err);
                that[thatKey] = data;
                cb();
            });
        };

        async.series([
            (cb) => readFile('cacert', 'caCert', cb),
            (cb) => readFile('cakey', 'caKey', cb),
            (cb) => pem.createPrivateKey(4096, (err, key) => {
                if (err)return cb(err);
                that.key = key.key;
                cb();
            }),
            (cb) => that.createCertificate(options.hostname, (err, cert) => {
                if (err)return cb(err);
                that.cert = cert;
                cb();
            })
        ], (err) => callback(err));
    }

    createCertificate(domain, callback) {
        if (this.verbose) console.log('CERT:'+domain);
        const csrOptions = {
            clientKey: this.key,
            country: 'XX',
            commonName: domain,
            altNames: [domain]
        };
        const serial = parseInt(Math.random() * 1000000);
        const certificateOptions = {
            serviceKey: this.caKey,
            serviceCertificate: this.caCert,
            serial: serial,
            days: 100        };
        pem.createCSR(csrOptions, (err, csr) => {
            if (err) return callback(err);
            certificateOptions.csr = csr.csr;

            pem.createCertificate(certificateOptions, (err, certificate) => {
                if (err) return callback(err);
                callback(undefined, certificate.certificate);
            });
        });
    }

    getCertificate(domain, callback) {
        if (this.certificates[domain] !== undefined) return callback(undefined, this.certificates[domain]);
        else this.createCertificate(domain, callback);
    }

    getContext(domain, callback) {
        const contextOptions = {
            key: this.key,
            cert: undefined,
            ca: this.caCert
        };
        this.getCertificate(domain, (err, cert) => {
            if (err) return callback(err);

            contextOptions.cert = cert;
            const context = tls.createSecureContext(contextOptions).context;
            callback(undefined, context);
        });
    }

    getServerOptions() {
        return {
            ca: this.caCert,
            cert: this.cert,
            key: this.key,
            SNICallback: (domain, cb) => this.getContext(domain, cb)
        };
    }
}

module.exports = new IdentityManager();
