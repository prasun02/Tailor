import { ArrowLeft, FileDown, Printer, ShieldAlert } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { AllPrintCopies } from '../features/printing/AllPrintCopies';
import { CustomerTokenPrint } from '../features/printing/CustomerTokenPrint';
import { ProductionJobCardPrint } from '../features/printing/ProductionJobCardPrint';
import { StoreOwnerCopyPrint } from '../features/printing/StoreOwnerCopyPrint';
import { resolveShopBrand, useShopBrand } from '../features/printing/useShopBrand';
import { useOrderDetail } from '../features/orders/orderHooks';
import { useShop } from '../features/shop/shopContext';

type PrintMode = 'customer-token' | 'production-copy' | 'store-copy' | 'all';

const copyLabels: Record<PrintMode, string> = {
  'customer-token': 'Customer Token',
  'production-copy': 'Production Copy',
  'store-copy': 'Store Copy',
  all: 'All Copies',
};

export function CustomerTokenPrintPage() {
  return <OrderPrintPage mode="customer-token" />;
}

export function ProductionCopyPrintPage() {
  return <OrderPrintPage mode="production-copy" />;
}

export function StoreCopyPrintPage() {
  return <OrderPrintPage mode="store-copy" />;
}

export function AllCopiesPrintPage() {
  return <OrderPrintPage mode="all" />;
}

function OrderPrintPage({ mode }: { mode: PrintMode }) {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const { currentShop, currentShopId } = useShop();
  const orderQuery = useOrderDetail(currentShopId, orderId);
  const shopBrandQuery = useShopBrand(currentShopId, currentShop);
  const shop = resolveShopBrand(shopBrandQuery.data, currentShop);
  const shouldAutoPrint = searchParams.get('autoprint') === '1';

  useEffect(() => {
    if (!shouldAutoPrint || !orderQuery.data) return;
    const timer = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(timer);
  }, [orderQuery.data, shouldAutoPrint]);

  if (orderQuery.isLoading) return <Loading label="Loading print preview" />;
  if (orderQuery.isError || !orderQuery.data) {
    return <EmptyState icon={ShieldAlert} title="Print copy unavailable" message={orderQuery.error?.message ?? 'Order could not be loaded.'} />;
  }

  const detail = orderQuery.data;
  const label = copyLabels[mode];

  return (
    <div className="print-workspace">
      <div className="print-toolbar no-print rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Print Preview</p>
            <h1 className="text-xl font-semibold text-slate-950">{label}</h1>
            <p className="mt-1 text-sm text-slate-600">Token No {detail.order.order_number}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Printer aria-hidden="true" className="h-4 w-4" />
              Print {label}
            </button>
            {mode === 'customer-token' ? (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <FileDown aria-hidden="true" className="h-4 w-4" />
                Save Customer Token as PDF
              </button>
            ) : null}
            <Link
              to={`/orders/${detail.order.id}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Open Order Detail
            </Link>
          </div>
        </div>
      </div>

      <div className="print-preview-frame">
        {mode === 'customer-token' ? <CustomerTokenPrint detail={detail} shop={shop} /> : null}
        {mode === 'production-copy' ? <ProductionJobCardPrint detail={detail} shop={shop} /> : null}
        {mode === 'store-copy' ? <StoreOwnerCopyPrint detail={detail} shop={shop} /> : null}
        {mode === 'all' ? <AllPrintCopies detail={detail} shop={shop} /> : null}
      </div>
    </div>
  );
}
