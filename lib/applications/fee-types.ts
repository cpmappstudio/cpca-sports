export type FeeType = {
  id: string;
  name: string;
  description?: string;
  downPayment: number;
  totalAmount: number;
  isRefundable: boolean;
  isIncluded: boolean;
  isDefault: boolean;
  isRequired: boolean;
};

export const DEFAULT_APPLICATION_FEES: FeeType[] = [
  {
    id: "i20_application_fee",
    name: "I-20 Application Fee",
    downPayment: 100,
    totalAmount: 200,
    isRefundable: true,
    isIncluded: true,
    isDefault: true,
    isRequired: true,
  },
  {
    id: "i20_tuition_fee",
    name: "I-20 Tuition Fee",
    downPayment: 100,
    totalAmount: 10000,
    isRefundable: true,
    isIncluded: true,
    isDefault: true,
    isRequired: true,
  },
  {
    id: "sports_uniform_fee",
    name: "Sports Uniform Fee",
    downPayment: 100,
    totalAmount: 300,
    isRefundable: true,
    isIncluded: true,
    isDefault: true,
    isRequired: true,
  },
];
