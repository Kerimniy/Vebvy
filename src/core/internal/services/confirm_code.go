package services

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"net/http"
	"sync"
	"time"

	"kerimniy.qzz.io/vebvy/pkg/tgbot"
)

const (
	codeTTL         = 10 * time.Minute
	codeCooldown    = 30 * time.Second
	maxCodeAttempts = 5
)

type AuthCodeStruct struct {
	mu       sync.Mutex
	code     string
	expires  time.Time
	attempts int
	lastSent time.Time
}

var AuthCode = AuthCodeStruct{}

func (a *AuthCodeStruct) NewCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func (a *AuthCodeStruct) Set(code string, ttl time.Duration) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.code = code
	a.expires = time.Now().Add(ttl)
	a.attempts = 0
}

// CheckAndConsume атомарно: истёк -> false; перебор попыток -> код сгорает;
func (a *AuthCodeStruct) CheckAndConsume(code string) bool {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.code == "" || time.Now().After(a.expires) {
		return false
	}
	a.attempts++
	if a.attempts > maxCodeAttempts {
		a.clearLocked()
		return false
	}
	if code != a.code {
		return false
	}
	a.clearLocked()
	return true
}

func (a *AuthCodeStruct) clearLocked() {
	a.code = ""
	a.expires = time.Time{}
	a.attempts = 0
}

func (a *AuthCodeStruct) CanSend() (bool, time.Duration) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if wait := codeCooldown - time.Since(a.lastSent); wait > 0 {
		return false, wait
	}
	a.lastSent = time.Now()
	return true, 0
}

func (a *AuthCodeStruct) UndoSend() {
	a.mu.Lock()
	a.lastSent = time.Time{}
	a.mu.Unlock()
}

func (a *AuthCodeStruct) Expires() time.Time {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.expires
}

func validateCode(code string) bool {
	return AuthCode.CheckAndConsume(code)
}

func sendConfirm() error {
	code, err := AuthCode.NewCode()
	if err != nil {
		return err
	}
	AuthCode.Set(code, codeTTL)
	return tgbot.SendCode(code, AuthCode.Expires())
}

func RequestConfirmCode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		w.Header().Set("Allow", "GET, POST")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ok, wait := AuthCode.CanSend(); !ok {
		w.Header().Set("Retry-After", fmt.Sprintf("%d", int(wait.Seconds())+1))
		http.Error(w, "too many code requests, try again later", http.StatusTooManyRequests)
		return
	}

	if err := sendConfirm(); err != nil {
		AuthCode.UndoSend()
		fmt.Println("send code:", err)
		http.Error(w, "failed to send code", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}
