import React from 'react';
import { Link } from 'react-router-dom';
import './Privacy.css';

export const Privacy: React.FC = () => {
  return (
    <div className="legal-page">
      <div className="legal-content">
        <h1>プライバシーポリシー</h1>
        <div className="legal-text">
          <p>プライバシーポリシーの内容をここに記載します。</p>
          {/* ここにプライバシーポリシーの詳細な内容を追加してください */}
        </div>
        <Link to="/login" className="back-link">ログインページに戻る</Link>
      </div>
    </div>
  );
};

