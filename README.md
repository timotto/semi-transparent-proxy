# Semi Transparent Proxy

This is a semi transparent HTTP/HTTPS proxy using DNS to capture requests using mitm techniques for HTTPS connections.
Clients need to use this server as DNS server as well as to trust the mitm CA to benefit from the STProxy.

The built-in DNS server forwards queries for domains listed with the --honest parameter to the OS DNS to ignore those
requests. All other queries receive the IP address given with the --bind parameter.

The built-in HTTP server uses the "host" HTTP header to determine the original destination. The HTTPS server uses the 
SNI sent by the client during the TLS handshake and creates a certificate with matching CN on the fly using the 
Certificate Authority given by the --cacert and --cakey parameters. 

All requests are then executed locally by the STProxy or forwarded to an HTTP proxy server when given through the 
--proxy parameter. 

## Motivation

Some computing environments require an HTTP proxy to access Internet resources. It is not always feasible to configure 
an explicit proxy server, and for other reasons as well, there are several solutions for transparent HTTP/HTTPS proxy 
setups based on IP layer manipulation to forward connections transparently to an HTTP proxy server. 

Unfortunately some computing environments do not allow manipulation at the IP layer, so a solution was needed at a 
higher layer where manipulation is still possible.  

## Options

``` shell
  -c, --cacert file         CA certificate                          
  -c, --cacert file         CA certificate                          
  -k, --cakey file          CA private key                          
  -n, --hostname hostname   Externally reachable hostname           
  -a, --bind ip             Externally reachable IP address         
  -s, --https port          HTTPS server ports                      
  -h, --http port           HTTP server ports                       
  -o, --dns port            DNS server port                         
  -d, --honest domain       Domains which will not be proxied       
  -p, --proxy url           HTTP Proxy to use for outgoing requests 
  -v, --verbose             Log request URLs                        
  -i, --insecure            Allow insecure HTTPS connections        
  --help                    Print this usage guide                  
```

## Examples

``` shell
proxy:~ root# semi-transparen-proxy --bind 192.168.56.1 \
  --honest corp --honest wan.corp.com \
  --http 80 -- http 8080 -- http 8888 --http 8080 \
  --cacert ca-cert.pem --cakey ca-key.pem \
  --proxy http://172.18.133.250:3128 \
  --verbose
system ready
```
