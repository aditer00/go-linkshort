package storage

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"url-service/models"

	"github.com/redis/go-redis/v9"
)

const (
	urlKeyPrefix = "url:"
	urlListKey   = "urls:list"
)

// RedisStorage implements URLStorage using Redis
type RedisStorage struct {
	client *redis.Client
	ctx    context.Context
}

// NewRedisStorage creates a new Redis storage instance
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

// Save stores a URL in Redis
func (s *RedisStorage) Save(url *models.URL) error {
	if url.CreatedAt.IsZero() {
		url.CreatedAt = time.Now()
	}

	data, err := json.Marshal(url)
	if err != nil {
		return err
	}

	key := urlKeyPrefix + url.ShortCode

	// Store URL data
	if err := s.client.Set(s.ctx, key, data, 0).Err(); err != nil {
		return err
	}

	// Add to list for FindAll
	if err := s.client.SAdd(s.ctx, urlListKey, url.ShortCode).Err(); err != nil {
		return err
	}

	return nil
}

// FindByShortCode retrieves a URL by its short code
func (s *RedisStorage) FindByShortCode(shortCode string) (*models.URL, error) {
	key := urlKeyPrefix + shortCode

	data, err := s.client.Get(s.ctx, key).Bytes()
	if err == redis.Nil {
		return nil, errors.New("url not found")
	}
	if err != nil {
		return nil, err
	}

	var url models.URL
	if err := json.Unmarshal(data, &url); err != nil {
		return nil, err
	}

	return &url, nil
}

// FindAll retrieves all stored URLs
func (s *RedisStorage) FindAll() ([]*models.URL, error) {
	shortCodes, err := s.client.SMembers(s.ctx, urlListKey).Result()
	if err != nil {
		return nil, err
	}

	urls := make([]*models.URL, 0, len(shortCodes))
	for _, shortCode := range shortCodes {
		url, err := s.FindByShortCode(shortCode)
		if err == nil {
			urls = append(urls, url)
		}
	}

	return urls, nil
}

// Exists checks if a short code already exists
func (s *RedisStorage) Exists(shortCode string) bool {
	key := urlKeyPrefix + shortCode
	exists, err := s.client.Exists(s.ctx, key).Result()
	if err != nil {
		return false
	}
	return exists > 0
}

// Close closes the Redis connection
func (s *RedisStorage) Close() error {
	return s.client.Close()
}
