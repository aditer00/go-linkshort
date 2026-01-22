package storage

import (
	"context"
	"encoding/json"
	"time"

	"analytics-service/models"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

const (
	clickKeyPrefix = "clicks:"
	statsListKey   = "stats:list"
)

// RedisStorage implements AnalyticsStorage using Redis
type RedisStorage struct {
	client *redis.Client
	ctx    context.Context
}

// NewRedisStorage creates a new Redis analytics storage instance
func NewRedisStorage(addr string) (*RedisStorage, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: "",
		DB:       0,
	})

	ctx := context.Background()

	// Test connection
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	return &RedisStorage{
		client: client,
		ctx:    ctx,
	}, nil
}

// SaveClick stores a click event in Redis
func (s *RedisStorage) SaveClick(event *models.ClickEvent) error {
	if event.ID == "" {
		event.ID = uuid.New().String()
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}

	data, err := json.Marshal(event)
	if err != nil {
		return err
	}

	key := clickKeyPrefix + event.ShortCode

	// Store click event in a list
	if err := s.client.RPush(s.ctx, key, data).Err(); err != nil {
		return err
	}

	// Add short code to tracking set
	if err := s.client.SAdd(s.ctx, statsListKey, event.ShortCode).Err(); err != nil {
		return err
	}

	return nil
}

// GetStatsByShortCode retrieves stats for a specific short code
func (s *RedisStorage) GetStatsByShortCode(shortCode string) (*models.Stats, error) {
	key := clickKeyPrefix + shortCode

	clickData, err := s.client.LRange(s.ctx, key, 0, -1).Result()
	if err != nil {
		return nil, err
	}

	clicks := make([]*models.ClickEvent, 0, len(clickData))
	for _, data := range clickData {
		var click models.ClickEvent
		if err := json.Unmarshal([]byte(data), &click); err == nil {
			clicks = append(clicks, &click)
		}
	}

	return &models.Stats{
		ShortCode:   shortCode,
		TotalClicks: len(clicks),
		Clicks:      clicks,
	}, nil
}

// GetAllStats retrieves stats for all short codes
func (s *RedisStorage) GetAllStats() ([]*models.Stats, error) {
	shortCodes, err := s.client.SMembers(s.ctx, statsListKey).Result()
	if err != nil {
		return nil, err
	}

	stats := make([]*models.Stats, 0, len(shortCodes))
	for _, shortCode := range shortCodes {
		key := clickKeyPrefix + shortCode
		count, err := s.client.LLen(s.ctx, key).Result()
		if err != nil {
			continue
		}

		stats = append(stats, &models.Stats{
			ShortCode:   shortCode,
			TotalClicks: int(count),
		})
	}

	return stats, nil
}

// Close closes the Redis connection
func (s *RedisStorage) Close() error {
	return s.client.Close()
}
