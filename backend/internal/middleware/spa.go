package middleware

import (
	"io"
	"io/fs"
	"net/http"
	"os"
	"strings"
)

// SPAHandler serves files from an embedded fs.FS with fallback to index.html for client routing
func SPAHandler(staticFS fs.FS) http.HandlerFunc {
	fileServer := http.FileServer(http.FS(staticFS))

	return func(w http.ResponseWriter, r *http.Request) {
		// Don't handle API routes
		if strings.HasPrefix(r.URL.Path, "/api") {
			http.NotFound(w, r)
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}

		// Check if file exists in filesystem
		f, err := staticFS.Open(path)
		if err == nil {
			_ = f.Close()

			// Special headers for Service Worker and manifest files
			if path == "sw.js" || path == "registerSW.js" {
				w.Header().Set("Service-Worker-Allowed", "/")
				w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
			} else if path == "manifest.webmanifest" || path == "manifest.json" {
				w.Header().Set("Content-Type", "application/manifest+json")
			}

			fileServer.ServeHTTP(w, r)
			return
		}

		if os.IsNotExist(err) || err != nil {
			// Fallback to index.html
			indexFile, err := staticFS.Open("index.html")
			if err != nil {
				http.NotFound(w, r)
				return
			}
			defer indexFile.Close()

			stat, err := indexFile.Stat()
			if err != nil {
				http.NotFound(w, r)
				return
			}

			if rs, ok := indexFile.(io.ReadSeeker); ok {
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				http.ServeContent(w, r, "index.html", stat.ModTime(), rs)
				return
			}

			// Read all if not seeker
			data, err := io.ReadAll(indexFile)
			if err != nil {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			_, _ = w.Write(data)
			return
		}

		fileServer.ServeHTTP(w, r)
	}
}
