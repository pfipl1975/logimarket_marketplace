import type { AdminOfferType } from "@/lib/admin/offer-type";

interface AdminOfferTypeSelectorCopy {
  fieldOfferType: string;
  offerTypeRfq: string;
  offerTypeMarketplace: string;
  offerTypeExternal: string;
  offerTypeRfqHelp: string;
  offerTypeMarketplaceHelp: string;
  offerTypeExternalHelp: string;
}

interface AdminOfferTypeSelectorProps {
  value: AdminOfferType | "";
  onChange: (value: AdminOfferType) => void;
  dict: AdminOfferTypeSelectorCopy;
}

const OFFER_TYPE_OPTIONS: Array<{
  value: AdminOfferType;
  labelKey: keyof Pick<
    AdminOfferTypeSelectorCopy,
    "offerTypeRfq" | "offerTypeMarketplace" | "offerTypeExternal"
  >;
  helpKey: keyof Pick<
    AdminOfferTypeSelectorCopy,
    | "offerTypeRfqHelp"
    | "offerTypeMarketplaceHelp"
    | "offerTypeExternalHelp"
  >;
}> = [
  {
    value: "rfq",
    labelKey: "offerTypeRfq",
    helpKey: "offerTypeRfqHelp",
  },
  {
    value: "marketplace",
    labelKey: "offerTypeMarketplace",
    helpKey: "offerTypeMarketplaceHelp",
  },
  {
    value: "external_partner",
    labelKey: "offerTypeExternal",
    helpKey: "offerTypeExternalHelp",
  },
];

export function AdminOfferTypeSelector({
  value,
  onChange,
  dict,
}: AdminOfferTypeSelectorProps) {
  return (
    <fieldset className="m-0 space-y-2 border-0 p-0">
      <legend className="text-sm font-medium text-brand-navy">
        {dict.fieldOfferType} *
      </legend>
      <div className="grid gap-3 md:grid-cols-3">
        {OFFER_TYPE_OPTIONS.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name="adminOfferType"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              required
              className="peer sr-only"
            />
            <span className="flex h-full flex-col rounded-industrial border border-border-industrial bg-white p-4 transition-colors hover:border-brand-teal/60 hover:bg-teal-50/30 peer-checked:border-brand-teal peer-checked:bg-teal-50/60 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-teal peer-focus-visible:ring-offset-2">
              <span className="text-sm font-semibold text-brand-navy">
                {dict[option.labelKey]}
              </span>
              <span className="mt-1 text-xs leading-5 text-muted-foreground">
                {dict[option.helpKey]}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
