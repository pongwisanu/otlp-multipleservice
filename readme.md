# Trace over multiple service with opentelemetry

## Description
to start
``` 
docker compose up -d
```

and check endpoint for root trace 
```
http://localhost:8000/node/ping
```
then check result in jaeger
```
http://localhost:16686
```

other endpoint
```
http://localhost:8000/python/pong
http://localhost:8000/go/pang
```