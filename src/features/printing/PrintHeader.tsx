import { useState } from 'react';
import { initialsForName, withShopBrandDefaults, type ShopBrand } from './printModel';
import './printStyles.css';

type PrintHeaderProps = {
  shop: ShopBrand;
  title: string;
  subtitle?: string;
  orderNumber: string;
};

export function PrintHeader({ shop, title, subtitle, orderNumber }: PrintHeaderProps) {
  const brand = withShopBrandDefaults(shop);
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(brand.logo_url && !logoFailed);

  return (
    <header className="print-header">
      <div className="print-brand">
        <div className="print-logo" aria-label={`${brand.name} logo`}>
          {showLogo ? (
            <img src={brand.logo_url ?? ''} alt={`${brand.name} logo`} onError={() => setLogoFailed(true)} />
          ) : (
            <span>{initialsForName(brand.name)}</span>
          )}
        </div>
        <div>
          <p className="print-shop-name">{brand.name}</p>
          {brand.address ? <p className="print-muted">{brand.address}</p> : null}
          {brand.phone ? <p className="print-muted">{brand.phone}</p> : null}
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