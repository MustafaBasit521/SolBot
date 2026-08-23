import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ARTICLES, type Article } from "../lib/articlesContent";
import { BottomNav } from "../components/BottomNav";
import "./ArticlesPage.css";

const CATEGORIES: Article["category"][] = ["Anxiety", "Mood", "How Sol works", "Eco-anxiety"];

export function ArticlesPage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "reader">("list");

  const selected = ARTICLES.find((a) => a.id === selectedId) ?? null;

  function openArticle(article: Article) {
    setSelectedId(article.id);
    setMobileView("reader");
  }

  return (
    <div className="articles-page">
      <p className="articles-eyebrow">Learn</p>
      <h1 className="articles-heading">Short articles</h1>
      <p className="articles-subtitle">
        Static, written content -- general information, not advice specific to you.
      </p>

      <div className="articles-layout">
        <div className={`articles-list-col ${mobileView === "reader" ? "articles-hidden-mobile" : ""}`}>
          {CATEGORIES.map((category) => {
            const items = ARTICLES.filter((a) => a.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category}>
                <p className="articles-category">{category}</p>
                <div className="articles-list-group">
                  {items.map((article) => (
                    <button
                      key={article.id}
                      className={`articles-list-item ${selectedId === article.id ? "active" : ""}`}
                      onClick={() => openArticle(article)}
                    >
                      <p className="articles-list-item-title">{article.title}</p>
                      <p className="articles-list-item-summary">{article.summary}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className={`articles-reader-col ${mobileView === "list" ? "articles-hidden-mobile" : ""}`}>
          {selected ? (
            <>
              <button className="articles-back" onClick={() => setMobileView("list")}>
                &larr; Back to articles
              </button>
              <p className="articles-reader-category">{selected.category}</p>
              <h2 className="articles-reader-title">{selected.title}</h2>
              {selected.body.map((paragraph, i) => (
                <p className="articles-reader-paragraph" key={i}>
                  {paragraph}
                </p>
              ))}
            </>
          ) : (
            <p className="articles-empty">Pick an article to read it here.</p>
          )}
        </div>
      </div>

      <button className="articles-crisis-link" onClick={() => navigate("/crisis-help")}>
        In crisis right now? Get help
      </button>

      <BottomNav />
    </div>
  );
}
