import { useState } from 'react';
import { initialsForName, type ShopBrand } from './printModel';
import './printStyles.css';

type PrintHeaderProps = {
  shop: ShopBrand;
  title: string;
  subtitle?: string;
  orderNumber: string;
};

export function PrintHeader({ shop, title, subtitle, orderNumber }: PrintHeaderProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(shop.logo_url && !logoFailed);

  return (
    <header className="print-header">
      <div className="print-brand">
        <div className="print-logo" aria-label={`${shop.name} logo`}>
          {showLogo ? (
            <img src={shop.logo_url ?? ''} alt={`${shop.name} logo`} onError={() => setLogoFailed(true)} />
          ) : (
            <span>{initialsForName(shop.name)}</span>
          )}
        </div>
        <div>
          <p className="print-shop-name">{shop.name}</p>
          {shop.address ? <p className="print-muted">{shop.address}</p> : null}
          {shop.phone ? <p className="print-muted">{shop.phone}</p> : null}
        </div>
      </div>
      <div className="text-right">
        <p className="print-copy-title">{title}</p>
        {subtitle ? <p className="print-muted">{subtitle}</p> : null}
        <p className="print-label mt-2">Token No</p>
        <p className="print-token-number">{orderNumber}</p>
      </div>
    </header>
  );
}
