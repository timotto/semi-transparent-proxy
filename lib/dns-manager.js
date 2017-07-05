'use strict';
const dnsd = require('dnsd');
const dns = require('dns');

class DnsManager {

    init(options, callback) {
        this.honestDomains = options['honest'];
        this.bindAddress = options['bind'];
        this.ip = options['ip'];
        this.verbose = options['verbose'];
        dnsd
            .createServer((req, res) => this.resolveDns(req, res))
            .listen(options.dns, options.bind, (err) => callback(err));
    }

    static paddIpv6Pair(p) {
        while (p.length < 4) p = '0' + p;
        return p;
    }

    static beautifyIpv6(a) {
        if (a === undefined) return a;
        const b = a.split(':');
        const c = b.pop();
        while (b.length < 7) b.push('');
        b.push(c);
        return b.map((e) => DnsManager.paddIpv6Pair(e)).join(':');
    };

    resolveDns(req, res) {
        const q = req.question[0];
        if (this.verbose) console.log('DNS:'+q.name);
        const real = this.honestDomains.reduce((t, d) => t || q.name.endsWith('.' + d), false);
        if (!real) {
            if (q.type === 'A') return res.end(this.ip);
            res.end();
            return;
        }
        dns.resolve(q.name, q.type, (err, records) => {
            if (err) {
                res.end();
                return;
            }
            records
                .map((r) =>
                    q.type === 'A' ? r :
                        q.type === 'AAAA' ? DnsManager.beautifyIpv6(r) :
                            q.type === 'MX' ? [r['priority'], r['exchange']] :
                                r)
                .forEach((r) => res.answer.push({name: q.name, type: q.type, data: r}));
            res.end();
        });
    }
}

module.exports = new DnsManager();
