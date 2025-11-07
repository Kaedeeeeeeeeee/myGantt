import React from 'react';
import { Link } from 'react-router-dom';
import './Tokushoho.css';

export const Tokushoho: React.FC = () => {
  return (
    <div className="legal-page">
      <div className="legal-content">
        <h1>特定商取引法に基づく表記</h1>
        <div className="legal-text">
          <p>特定商取引法に基づく表記の内容をここに記載します。</p>
          {/* ここに特定商取引法に基づく表記の詳細な内容を追加してください */}
        </div>
        <Link to="/login" className="back-link">ログインページに戻る</Link>
      </div>
    </div>
  );
};

