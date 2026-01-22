package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"analytics-service/models"
	"analytics-service/storage"

	"github.com/gorilla/mux"
)

// AnalyticsHandler handles analytics-related HTTP requests
type AnalyticsHandler struct {
	storage storage.AnalyticsStorage
}

// NewAnalyticsHandler creates a new analytics handler
func NewAnalyticsHandler(s storage.AnalyticsStorage) *AnalyticsHandler {
	return &AnalyticsHandler{
		storage: s,
	}
}

// TrackClick handles POST /track requests
func (h *AnalyticsHandler) TrackClick(w http.ResponseWriter, r *http.Request) {
	var req models.TrackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ShortCode == "" {
		http.Error(w, "short_code is required", http.StatusBadRequest)
		return
	}

	event := &models.ClickEvent{
		ShortCode: req.ShortCode,
		Timestamp: time.Now(),
		UserAgent: req.UserAgent,
		Referrer:  req.Referrer,
	}

	if err := h.storage.SaveClick(event); err != nil {
		http.Error(w, "Failed to track click", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// GetStats handles GET /stats/{shortCode} requests
func (h *AnalyticsHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	shortCode := vars["shortCode"]

	stats, err := h.storage.GetStatsByShortCode(shortCode)
	if err != nil {
		http.Error(w, "Failed to get stats", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// GetAllStats handles GET /stats requests
func (h *AnalyticsHandler) GetAllStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.storage.GetAllStats()
	if err != nil {
		http.Error(w, "Failed to get stats", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// HealthCheck handles GET /health requests
func (h *AnalyticsHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}
