# LinkShort Kubernetes Deployment

## Prerequisites

- Kubernetes cluster (v1.25+)
- kubectl configured
- nginx-ingress controller installed
- (Optional) cert-manager for SSL

## Quick Deploy

```bash
# Apply all manifests
kubectl apply -f kubernetes-manifests/

# Or apply individually in order
kubectl apply -f kubernetes-manifests/00-namespace.yaml
kubectl apply -f kubernetes-manifests/01-configmap.yaml
kubectl apply -f kubernetes-manifests/02-redis.yaml
kubectl apply -f kubernetes-manifests/03-url-service.yaml
kubectl apply -f kubernetes-manifests/04-analytics-service.yaml
kubectl apply -f kubernetes-manifests/05-frontend.yaml
kubectl apply -f kubernetes-manifests/06-ingress.yaml
kubectl apply -f kubernetes-manifests/07-hpa.yaml
```

## Configuration

### Update Domains

Edit `06-ingress.yaml` and replace:
- `example.com` → your frontend domain
- `api.example.com` → your API domain
- `s.example.com` → your short URL domain

### Update ConfigMap

Edit `01-configmap.yaml` to match your domains:
```yaml
PUBLIC_URL_SERVICE: "https://api.yourdomain.com"
PUBLIC_ANALYTICS_SERVICE: "https://api.yourdomain.com"
PUBLIC_SHORT_URL_DOMAIN: "https://s.yourdomain.com"
```

## Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n linkshort

# Check services
kubectl get svc -n linkshort

# Check ingress
kubectl get ingress -n linkshort

# View logs
kubectl logs -n linkshort -l app=url-service
kubectl logs -n linkshort -l app=analytics-service
kubectl logs -n linkshort -l app=frontend
```

## Scaling

Automatic scaling is configured via HPA. Manual scaling:

```bash
# Scale URL service
kubectl scale deployment url-service -n linkshort --replicas=5

# Scale analytics service
kubectl scale deployment analytics-service -n linkshort --replicas=3
```

## Cleanup

```bash
kubectl delete namespace linkshort
```

## Architecture

```
                    ┌─────────────────────────────────┐
                    │        Ingress Controller       │
                    │   (nginx-ingress / traefik)     │
                    └───────────────┬─────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Frontend    │         │   URL Service   │         │    Analytics    │
│   (2 pods)    │         │    (2+ pods)    │         │    (2+ pods)    │
│   Port 3000   │         │    Port 8080    │         │    Port 8081    │
└───────────────┘         └────────┬────────┘         └────────┬────────┘
                                   │                           │
                                   └───────────┬───────────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │       Redis         │
                                    │  (1 pod, ephemeral) │
                                    │     Port 6379       │
                                    └─────────────────────┘
```
