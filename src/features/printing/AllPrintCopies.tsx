import type { OrderDetail } from '../orders/orderService';
import { CustomerTokenPrint } from './CustomerTokenPrint';
import { ProductionJobCardPrint } from './ProductionJobCardPrint';
import { StoreOwnerCopyPrint } from './StoreOwnerCopyPrint';
import type { ShopBrand } from './printModel';

type AllPrintCopiesProps = {
  detail: OrderDetail;
  shop: ShopBrand;
  printedBy?: string;
};

export function AllPrintCopies({ detail, shop, printedBy }: AllPrintCopiesProps) {
  return (
    <div data-testid="all-print-copies">
      <div className="print-page">
        <CustomerTokenPrint detail={detail} shop={shop} />
      </div>
      <div className="print-page">
        <ProductionJobCardPrint detail={detail} shop={shop} />
      </div>
      <div className="print-page">
        <StoreOwnerCopyPrint detail={detail} shop={shop} printedBy={printedBy} />
      </div>
    </div>
  );
}
