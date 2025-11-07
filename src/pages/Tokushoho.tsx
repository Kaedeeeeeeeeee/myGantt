import React from 'react';
import { Link } from 'react-router-dom';
import './Tokushoho.css';

export const Tokushoho: React.FC = () => {
  return (
    <div className="legal-page">
      <div className="legal-content">
        <h1>特定商取引法に基づく表記</h1>
        <dl className="tokushoho-list">
          <dt>販売業者名</dt>
          <dd>myGantt</dd>

          <dt>運営統括責任者名</dt>
          <dd>張詩楓</dd>

          <dt>所在地</dt>
          <dd>〒980-0022<br />
            宮城県仙台市青葉区五橋２−１０−１１　６１１</dd>

          <dt>お問い合わせ先</dt>
          <dd>
            メールアドレス：f.shera.09@gmail.com
            <br />
            ※お問い合わせはメールにてお願いいたします。
            <br />
            ※電話番号については、お問い合わせがあった場合に遅滞なく開示いたします。
          </dd>

          <dt>販売価格</dt>
          <dd>
            各商品ページまたはアプリ内に表示された価格に基づきます。
            <br />
            表示価格は消費税を含みます。
          </dd>

          <dt>商品代金以外の必要料金</dt>
          <dd>
            インターネット接続に関わる通信料金はお客様のご負担となります。
            <br />
            その他、商品代金以外の必要料金は一切かかりません。
          </dd>

          <dt>支払方法</dt>
          <dd>
            クレジットカード決済（Stripeを利用）
            <br />
            対応カード：Visa、Mastercard、American Express、JCB、その他Stripeが対応するクレジットカード
          </dd>

          <dt>支払時期</dt>
          <dd>
            クレジットカード：商品注文時にお支払いが確定します。
            <br />
            お支払いは各クレジットカード会社の規約に従います。
          </dd>

          <dt>サービスの提供時期</dt>
          <dd>
            決済完了後、即時ご利用いただけます。
            <br />
            決済完了後、自動的にサービスが有効化されます。
          </dd>

          <dt>返品・キャンセルについて</dt>
          <dd>
            デジタルコンテンツの性質上、決済完了後の返金・キャンセルは原則お受けしておりません。
            <br />
            ただし、以下の場合は返金を承ります：
            <br />
            （1）サービス内容に重大な不具合があり、当方の責任によりサービスを提供できない場合
            <br />
            （2）当方の過失により、お客様が意図したサービスと異なるサービスが提供された場合
            <br />
            <br />
            返金を希望される場合は、上記お問い合わせ先までご連絡ください。
            <br />
            返金の可否については、個別に審査の上、ご返答いたします。
            <br />
            返金が認められた場合、返金処理には1〜2週間程度かかる場合があります。
          </dd>

          <dt>動作環境</dt>
          <dd>
            最新のWebブラウザにてご利用ください。
            <br />
            推奨ブラウザ：Google Chrome、Mozilla Firefox、Safari、Microsoft Edge（最新版）
            <br />
            モバイル端末からもご利用いただけます。
          </dd>

          <dt>その他</dt>
          <dd>
            本サービスに関する利用規約、プライバシーポリシーについては、別途定めるものとします。
            <br />
            本表記に関するお問い合わせも、上記お問い合わせ先までご連絡ください。
          </dd>
        </dl>

        <footer className="tokushoho-footer">
          &copy; 2025 myGantt
        </footer>

        <Link to="/login" className="back-link">ログインページに戻る</Link>
      </div>
    </div>
  );
};

