# LinkShort Helm Chart

A Helm chart for deploying LinkShort URL Shortener microservices.

## Prerequisites

- Kubernetes 1.25+
- Helm 3.0+
- nginx-ingress controller

## Installation

```bash
# Install with default values
helm install linkshort ./helm-chart

# Install with custom values
helm install linkshort ./helm-chart -f my-values.yaml

# Install in specific namespace
helm install linkshort ./helm-chart -n linkshort --create-namespace
```

## Configuration

### Quick Configuration

```bash
# Install with custom domains
helm install linkshort ./helm-chart \
  --set domains.frontend=myapp.com \
  --set domains.api=api.myapp.com \
  --set domains.shortUrl=s.myapp.com
```

### Key Values

| Parameter | Description | Default |
|-----------|-------------|---------|
| `domains.frontend` | Frontend domain | `example.com` |
| `domains.api` | API domain | `api.example.com` |
| `domains.shortUrl` | Short URL domain | `s.example.com` |
| `storage.type` | Storage backend | `redis` |
| `urlService.replicaCount` | URL service replicas | `2` |
| `analyticsService.replicaCount` | Analytics replicas | `2` |
| `frontend.replicaCount` | Frontend replicas | `2` |
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.tls.enabled` | Enable TLS | `false` |

### Enable TLS

```bash
helm install linkshort ./helm-chart \
  --set domains.frontend=myapp.com \
  --set domains.api=api.myapp.com \
  --set domains.shortUrl=s.myapp.com \
  --set ingress.tls.enabled=true \
  --set ingress.tls.secretName=linkshort-tls \
  --set ingress.annotations."cert-manager\.io/cluster-issuer"=letsencrypt-prod
```

### Custom Image Tags

```bash
helm install linkshort ./helm-chart \
  --set global.imageTag=v1.2.0
```

## Upgrade

```bash
helm upgrade linkshort ./helm-chart -f my-values.yaml
```

## Uninstall

```bash
helm uninstall linkshort
```

## Chart Structure

```
helm-chart/
├── Chart.yaml              # Chart metadata
├── values.yaml             # Default values
├── README.md               # This file
└── templates/
    ├── _helpers.tpl        # Template helpers
    ├── configmap.yaml      # ConfigMap
    ├── redis.yaml          # Redis deployment
    ├── url-service.yaml    # URL Service
    ├── analytics-service.yaml  # Analytics Service
    ├── frontend.yaml       # Frontend
    ├── ingress.yaml        # Ingress rules
    └── hpa.yaml            # Autoscalers
```
