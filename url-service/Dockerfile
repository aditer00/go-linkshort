# Build stage
FROM golang:1.24-trixie AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum* ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Runtime stage
FROM debian:stable-slim

WORKDIR /app

# Install ca-certificates for HTTPS requests
RUN apt-get -y update &&  \ 
    apt-get install --no-install-recommends  \
    -y ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/main .

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]
