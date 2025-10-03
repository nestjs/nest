# Circuit Breaker Sample Application

This sample demonstrates the usage of the Circuit Breaker feature in NestJS.

## Features Demonstrated

- Basic circuit breaker usage with external API calls
- Database connection protection
- Microservice communication resilience
- Health monitoring and metrics
- Configuration options

## Installation

```bash
npm install
```

## Running the Application

```bash
npm run start
```

## Testing Circuit Breaker

### Test External API Circuit Breaker
```bash
# Successful calls
curl http://localhost:3000/api/external-success

# Trigger failures to open circuit
curl http://localhost:3000/api/external-fail

# Check circuit breaker status
curl http://localhost:3000/health
```

### Test Database Circuit Breaker
```bash
# Successful database operations
curl http://localhost:3000/users

# Simulate database failures
curl -X POST http://localhost:3000/users/simulate-db-error

# Check metrics
curl http://localhost:3000/metrics/circuit-breakers
```

## Circuit Breaker States

- **CLOSED**: Normal operation, requests allowed
- **OPEN**: Circuit is open, requests fail fast
- **HALF_OPEN**: Testing recovery, limited requests allowed

## Configuration

Circuit breakers can be configured with:
- `failureThreshold`: Number of failures to open circuit (default: 5)
- `timeout`: Time to wait before trying to recover (default: 60s)
- `successThreshold`: Successful calls needed to close circuit (default: 3)
- `timeWindow`: Time window for counting failures (default: 60s)