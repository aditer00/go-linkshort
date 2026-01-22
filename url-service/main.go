package main

import (
	"log"
	"net/http"
	"os"

	"url-service/handlers"
	"url-service/storage"

	"github.com/gorilla/mux"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func initStorage() storage.URLStorage {
	storageType := os.Getenv("STORAGE_TYPE")
	redisURL := os.Getenv("REDIS_URL")

	if storageType == "redis" {
		if redisURL == "" {
			redisURL = "localhost:6379"
		}
		log.Printf("Initializing Redis storage at %s", redisURL)
		store, err := storage.NewRedisStorage(redisURL)
		if err != nil {
			log.Printf("Failed to connect to Redis: %v, falling back to memory storage", err)
			return storage.NewMemoryStorage()
		}
		log.Println("Redis storage initialized successfully")
		return store
	}

	log.Println("Using in-memory storage")
	return storage.NewMemoryStorage()
}

func main() {
	// Initialize storage based on STORAGE_TYPE environment variable
	store := initStorage()

	// Initialize handlers
	urlHandler := handlers.NewURLHandler(store)

	// Setup router
	r := mux.NewRouter()

	// Routes
	r.HandleFunc("/health", urlHandler.HealthCheck).Methods("GET")
	r.HandleFunc("/shorten", urlHandler.CreateShortURL).Methods("POST", "OPTIONS")
	r.HandleFunc("/urls", urlHandler.GetAllURLs).Methods("GET", "OPTIONS")
	r.HandleFunc("/{shortCode}", urlHandler.RedirectURL).Methods("GET")

	// Apply CORS middleware
	handler := corsMiddleware(r)

	// Get port from environment or default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("URL Service starting on port %s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
