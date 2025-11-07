import React from 'react';
import { Link } from 'react-router-dom';
import './Terms.css';

export const Terms: React.FC = () => {
  return (
    <div className="legal-page">
      <div className="legal-content">
        <h1>利用規約</h1>
        <div className="legal-text">
          <p>利用規約の内容をここに記載します。</p>
          {/* ここに利用規約の詳細な内容を追加してください */}
        </div>
        <Link to="/login" className="back-link">ログインページに戻る</Link>
      </div>
    </div>
  );
};

