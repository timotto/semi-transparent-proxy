'use strict';

const commandLineOptions = [
    {
        name: 'cacert',
        alias: 'c',
        type: String,
        description: 'CA certificate',
        defaultValue: 'ca-cert.pem',
        typeLabel: '[underline]{file}'
    },
    {
        name: 'cakey',
        alias: 'k',
        type: String,
        description: 'CA private key',
        defaultValue: 'ca-key.pem',
        typeLabel: '[underline]{file}'
    },
    {
        name: 'hostname',
        alias: 'n',
        type: String,
        description: 'Externally reachable hostname',
        defaultValue: 'localhost',
        typeLabel: '[underline]{hostname}'
    },
    {
        name: 'bind',
        alias: 'a',
        type: String,
        description: 'Externally reachable IP address',
        defaultValue: '127.0.0.1',
        typeLabel: '[underline]{ip}'
    },
    {
        name: 'https',
        alias: 's',
        type: Number,
        multiple: true,
        description: 'HTTPS server ports',
        defaultValue: [443, 8443],
        typeLabel: '[underline]{port}'
    },
    {
        name: 'http',
        alias: 'h',
        type: Number,
        multiple: true,
        description: 'HTTP server ports',
        defaultValue: [80, 8080],
        typeLabel: '[underline]{port}'
    },
    {
        name: 'dns',
        alias: 'o',
        type: Number,
        description: 'DNS server port',
        defaultValue: 53,
        typeLabel: '[underline]{port}'
    },
    {
        name: 'honest',
        alias: 'd',
        type: String,
        multiple: true,
        description: 'Domains which will not be proxied',
        defaultValue: 'local',
        typeLabel: '[underline]{domain}'
    },
    {
        name: 'proxy',
        alias: 'p',
        type: String,
        description: 'HTTP Proxy to use for outgoing requests',
        typeLabel: '[underline]{url}'
    },
    {name: 'verbose', alias: 'v', type: Boolean, defaultValue: false, description: 'Log request URLs'},
    {name: 'insecure', alias: 'i', type: Boolean, defaultValue: false, description: 'Allow insecure HTTPS connections'},
    {name: 'help', description: 'Print this usage guide', type: Boolean, defaultValue: false}
];

const sections = [
    {
        header: 'Semi Transparent Proxy',
        content: 'A semi transparent HTTP/HTTPS proxy using DNS to capture requests using mitm techniques for HTTPS connections.'
    },
    {
        header: 'Options',
        optionList: commandLineOptions
    }
];

const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
const http = require('http');
const https = require('https');
const request = require('request');
const async = require('async');

const IdentityManager = require('./lib/identity-manager');
const DnsManager = require('./lib/dns-manager');

const options = commandLineArgs(commandLineOptions, {partial: true});

if (options['help'] || options['_unknown'] !== undefined) {
    const usage = commandLineUsage(sections);
    console.log(usage);
    process.exit(0);
}

function requestListener(req, res) {
    const hostPart = req.headers.host;
    const secure = (req.socket !== undefined && req.socket['_tlsOptions'] !== undefined);

    const httpClientOptions = {
        proxy: options['proxy'],
        url: [secure ? 'https' : 'http', '://', hostPart, req.url].join(''),
        followRedirect: false,
        strictSSL: !options['insecure']
    };

    if (options['verbose']) console.log(req.method+':'+httpClientOptions.url);

    req
        .pipe(
            request(httpClientOptions)
                .on('error', (e) => {
                    res.writeHead(500, e);
                    res.end('ERROR:'+JSON.stringify(e, null, '\t'));
                }))
        .pipe(res);
}

async.series([
    (cb) => DnsManager.init(options, cb),
    (cb) => IdentityManager.init(options, cb),
    (cb) => async.each(options['https'],
        (p, cb1) => https
            .createServer(IdentityManager.getServerOptions(), requestListener)
            .listen(p, options['bind'], cb1), cb),
    (cb) => async.each(options['http'],
        (p, cb1) => http
            .createServer(requestListener)
            .listen(p, options['bind'], cb1), cb)
], (err) => {
    if (err) {
        console.error('initialization failed', err);
        process.exit(1);
        return;
    }
    console.log('system ready');
});

process.on('uncaughtException', (err) => {
    console.error('uncaught exception', err);
});
