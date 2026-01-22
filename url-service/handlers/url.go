package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"

	"url-service/models"
	"url-service/storage"

	"github.com/gorilla/mux"
)

const (
	shortCodeLength = 6
	charset         = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
)

// URLHandler handles URL-related HTTP requests
type URLHandler struct {
	storage             storage.URLStorage
	analyticsServiceURL string
}

// NewURLHandler creates a new URL handler
func NewURLHandler(s storage.URLStorage) *URLHandler {
	analyticsURL := os.Getenv("ANALYTICS_SERVICE_URL")
	if analyticsURL == "" {
		analyticsURL = "http://localhost:8081"
	}

	return &URLHandler{
		storage:             s,
		analyticsServiceURL: analyticsURL,
	}
}

// generateShortCode creates a random alphanumeric string
func (h *URLHandler) generateShortCode() string {
	rand.Seed(time.Now().UnixNano())

	for {
		code := make([]byte, shortCodeLength)
		for i := range code {
			code[i] = charset[rand.Intn(len(charset))]
		}
		shortCode := string(code)

		// Ensure uniqueness
		if !h.storage.Exists(shortCode) {
			return shortCode
		}
	}
}

// normalizeURL ensures the URL has a valid scheme
func normalizeURL(rawURL string) string {
	rawURL = strings.TrimSpace(rawURL)
	if !strings.HasPrefix(rawURL, "http://") && !strings.HasPrefix(rawURL, "https://") {
		return "https://" + rawURL
	}
	return rawURL
}

// CreateShortURL handles POST /shorten requests
func (h *URLHandler) CreateShortURL(w http.ResponseWriter, r *http.Request) {
	var req models.CreateURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.URL == "" {
		http.Error(w, "URL is required", http.StatusBadRequest)
		return
	}

	originalURL := normalizeURL(req.URL)
	shortCode := h.generateShortCode()

	url := &models.URL{
		ID:          shortCode,
		ShortCode:   shortCode,
		OriginalURL: originalURL,
		CreatedAt:   time.Now(),
	}

	if err := h.storage.Save(url); err != nil {
		http.Error(w, "Failed to save URL", http.StatusInternalServerError)
		return
	}

	// Get the host from the request for the short URL
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	host := r.Host

	response := models.CreateURLResponse{
		ShortCode:   shortCode,
		ShortURL:    fmt.Sprintf("%s://%s/%s", scheme, host, shortCode),
		OriginalURL: originalURL,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// RedirectURL handles GET /{shortCode} requests
func (h *URLHandler) RedirectURL(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	shortCode := vars["shortCode"]

	url, err := h.storage.FindByShortCode(shortCode)
	if err != nil {
		http.Error(w, "URL not found", http.StatusNotFound)
		return
	}

	// Track click asynchronously
	go h.trackClick(shortCode, r.UserAgent(), r.Referer())

	http.Redirect(w, r, url.OriginalURL, http.StatusFound)
}

// trackClick sends a click event to the analytics service
func (h *URLHandler) trackClick(shortCode, userAgent, referrer string) {
	payload := map[string]string{
		"short_code": shortCode,
		"user_agent": userAgent,
		"referrer":   referrer,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Failed to marshal track payload: %v", err)
		return
	}

	resp, err := http.Post(
		h.analyticsServiceURL+"/track",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		log.Printf("Failed to track click: %v", err)
		return
	}
	defer resp.Body.Close()
}

// GetAllURLs handles GET /urls requests
func (h *URLHandler) GetAllURLs(w http.ResponseWriter, r *http.Request) {
	urls, err := h.storage.FindAll()
	if err != nil {
		http.Error(w, "Failed to retrieve URLs", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(urls)
}

// HealthCheck handles GET /health requests
func (h *URLHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}
