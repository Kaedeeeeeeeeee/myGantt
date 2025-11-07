import React from 'react';
import { Link } from 'react-router-dom';
import './Tokushoho.css';

export const Tokushoho: React.FC = () => {
  return (
    <div className="legal-page">
      <div className="legal-content">
        <h1>特定商取引法に基づく表記</h1>
        <dl className="tokushoho-list">
          <dt>販売事業者</dt>
          <dd>myGantt（運営者名：張詩楓）</dd>

          <dt>運営責任者</dt>
          <dd>張詩楓</dd>

          <dt>所在地</dt>
          <dd>宮城県仙台市青葉区五橋２−１０−１１　６１１</dd>

          <dt>お問い合わせ先</dt>
          <dd>
            メールアドレス：f.shera.09@gmail.com
            <br />
            ※お問い合わせはメールにてお願いいたします。
          </dd>

          <dt>販売価格</dt>
          <dd>各商品ページまたはアプリ内に表示された価格に基づきます。</dd>

          <dt>商品代金以外の必要料金</dt>
          <dd>インターネット接続に関わる通信料金はお客様のご負担となります。</dd>

          <dt>支払方法</dt>
          <dd>クレジットカード決済（Stripeを利用）</dd>

          <dt>サービスの提供時期</dt>
          <dd>決済完了後、即時ご利用いただけます。</dd>

          <dt>返品・キャンセルについて</dt>
          <dd>
            商品の性質上、決済完了後の返金・キャンセルは原則お受けしておりません。サービス内容に不具合がある場合は、上記お問い合わせ先までご連絡ください。
          </dd>

          <dt>動作環境</dt>
          <dd>最新のWebブラウザにてご利用ください。</dd>
        </dl>

        <footer className="tokushoho-footer">
          &copy; 2025 myGantt
        </footer>

        <Link to="/login" className="back-link">ログインページに戻る</Link>
      </div>
    </div>
  );
};

