/* eslint-disable */
// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./RoadshowQO.css";
import { useNavigate } from "react-router-dom";

const LOGO_SRC = "/adinn-logo.png";

const VEHICLES_JSON_URL =
  "https://adinn-space.sgp1.cdn.digitaloceanspaces.com/roadshowRateCard/vehicles.json";

const CATEGORY_ORDER = ["Flex Branding", "Hybrid LED + Flex", "LED Vehicles"];

const LED_TV_ADDON_RATE_PER_DAY = 350;
const LED_55_TV_ADDON_RATE_PER_DAY = 500;
const POWER_BACKUP_ADDON_RATE_PER_DAY = 600;
const RTO_PERMISSION_VALIDITY_DAYS = 28;

const COMPANY_DETAILS = {
  name: "ADINN",
  title: "Roadshow Campaign Quotation",
  validityDays: 7,
};

const PREPARED_BY_DEFAULTS = {
  companyName: "Adinn Advertisment services Ltd",
  staffName: "",
  staffPhone: "",
  email: "",
  address: "",
};

const TERMS_AND_CONDITIONS = [
  "Extra KM, toll, parking and local permission charges will be billed additionally wherever applicable.",
  "Vehicle availability is subject to confirmation at the time of booking.",
  "50% advance payment is required to confirm the campaign booking.",
  "Taxes are applicable as per government norms.",
  "Add-on charges apply only when selected in this quotation.",
];

type QuickSpec = {
  label: string;
  value: string;
};

type LocationCharge = {
  label: string;
  chennai: string;
  rotn: string;
  kerala: string;
  otherStates: string;
};

type Vehicle = {
  id: number | string;
  name: string;
  category: string;
  type: string;
  shortDescription: string;
  pricePerDay: number;
  highlight: string;
  quickSpecs: QuickSpec[];
  included: string[];
  brandingStatus: string;
  addOns: string[];
  images?: string[];
  image?: string;
  locationCharges?: LocationCharge[];
  packageTotal?: string;
};

type ClientDetails = {
  clientName: string;
  companyName: string;
  contactNumber: string;
  email: string;
  campaignName: string;
  campaignLocation: string;
};

type PreparedByDetails = {
  companyName: string;
  staffName: string;
  staffPhone: string;
  email: string;
  address: string;
};

type PricingDetails = {
  vehicleRate: number;
  brandingCost: number;
  rtoPermission: number;
  promoterCost: number;
  ledCost: number;
  led55Cost: number;
  powerBackup: number;
  upDownCharge: number;
};

type RegionKey = "chennai" | "rotn" | "kerala" | "otherStates";

type QuoteLineItem = {
  label: string;
  description: string;
  rateLabel: string;
  periodLabel: string;
  quantityLabel: string;
  formulaLabel: string;
  amount: number;
};

type Html2CanvasFn = (
  element: HTMLElement,
  options?: Record<string, unknown>,
) => Promise<HTMLCanvasElement>;

type JsPdfInstance = {
  addImage: (...args: unknown[]) => void;
  addPage: (...args: unknown[]) => void;
  save: (fileName: string) => void;
};

type JsPdfConstructor = new (options: Record<string, unknown>) => JsPdfInstance;

declare global {
  interface Window {
    html2canvas?: Html2CanvasFn;
    jspdf?: {
      jsPDF: JsPdfConstructor;
    };
  }
}

type CropSelection = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const DEFAULT_SIGNATURE_CROP: CropSelection = {
  x: 10,
  y: 30,
  width: 80,
  height: 40,
};

const MIN_SIGNATURE_CROP_SIZE = 3;

const normalizeCropValue = (value: number) => {
  return Math.max(0, Math.min(100, value));
};

const normalizeCropSelection = (crop: CropSelection): CropSelection => {
  const x = normalizeCropValue(crop.x);
  const y = normalizeCropValue(crop.y);
  const width = normalizeCropValue(crop.width);
  const height = normalizeCropValue(crop.height);

  return {
    x,
    y,
    width: Math.min(width, 100 - x),
    height: Math.min(height, 100 - y),
  };
};

const normalizeCropFromPoints = (
  startPoint: Pick<CropSelection, "x" | "y">,
  endPoint: Pick<CropSelection, "x" | "y">,
): CropSelection => {
  return normalizeCropSelection({
    x: Math.min(startPoint.x, endPoint.x),
    y: Math.min(startPoint.y, endPoint.y),
    width: Math.abs(endPoint.x - startPoint.x),
    height: Math.abs(endPoint.y - startPoint.y),
  });
};

const readFileAsDataUrl = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read the selected image."));
    };

    reader.onerror = () => reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
};

const loadImageElement = (src: string) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load the selected image."));
    image.src = src;
  });
};

const canvasToPngDataUrl = (canvas: HTMLCanvasElement) => {
  return canvas.toDataURL("image/png");
};

const normalizeImageFileToDataUrl = async (file: File) => {
  try {
    if ("createImageBitmap" in window) {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions);

      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Unable to prepare the selected image.");
      }

      context.drawImage(bitmap, 0, 0);
      bitmap.close?.();

      return canvasToPngDataUrl(canvas);
    }
  } catch (error) {
    console.warn("Image orientation normalization failed; using fallback.", error);
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImageElement(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    return dataUrl;
  }

  context.drawImage(image, 0, 0);
  return canvasToPngDataUrl(canvas);
};

const normalizeCategory = (category: string) => {
  if (category === "LED Vehicle") return "Hybrid LED + Flex";
  if (category === "Premium LED") return "LED Vehicles";
  return category;
};

const isVehicleArray = (value: unknown): value is Vehicle[] => {
  return Array.isArray(value);
};

const parseMoney = (value?: string | number) => {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const numericText = String(value).replace(/[^\d.-]/g, "");
  const parsed = Number(numericText);

  return Number.isFinite(parsed) ? parsed : 0;
};

const formatPrice = (amount: number) => {
  return `₹ ${Math.round(amount).toLocaleString("en-IN")}`;
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const clampNumber = (value: string, minValue: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return minValue;
  return Math.max(minValue, parsed);
};

const getRegionLabel = (region: RegionKey) => {
  const labels: Record<RegionKey, string> = {
    chennai: "Chennai",
    rotn: "ROTN",
    kerala: "Kerala",
    otherStates: "Other States",
  };

  return labels[region];
};

const getRtoBillingMonths = (campaignDays: number) => {
  return Math.max(1, Math.ceil(campaignDays / RTO_PERMISSION_VALIDITY_DAYS));
};

const waitForImagesToLoad = async (selector: string) => {
  const images = Array.from(
    document.querySelectorAll<HTMLImageElement>(selector),
  );

  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();

      return new Promise<void>((resolve) => {
        const done = () => resolve();

        image.addEventListener("load", done, { once: true });
        image.addEventListener("error", done, { once: true });
      });
    }),
  );
};

const findCharge = (
  vehicle: Vehicle | undefined,
  labelKeywords: string[],
  region: RegionKey,
) => {
  if (!vehicle?.locationCharges?.length) return 0;

  const row = vehicle.locationCharges.find((item) => {
    const label = item.label.toLowerCase();

    return labelKeywords.some((keyword) =>
      label.includes(keyword.toLowerCase()),
    );
  });

  if (!row) return 0;

  return parseMoney(row[region]);
};

const getDefaultPricing = (
  vehicle: Vehicle | undefined,
  region: RegionKey,
): PricingDetails => {
  return {
    vehicleRate: vehicle?.pricePerDay || 0,
    brandingCost: findCharge(vehicle, ["branding"], region),
    rtoPermission: findCharge(vehicle, ["rto", "permission"], region),
    promoterCost: findCharge(vehicle, ["promoter"], region),
    ledCost: LED_TV_ADDON_RATE_PER_DAY,
    led55Cost: LED_55_TV_ADDON_RATE_PER_DAY,
    powerBackup: POWER_BACKUP_ADDON_RATE_PER_DAY,
    upDownCharge: 0,
  };
};

const downloadJsonFile = (data: Vehicle[], fileName = "vehicles.json") => {
  const jsonText = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonText], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const HTML2CANVAS_CDN_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
const JSPDF_CDN_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

const waitForNextPaint = async () => {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
};

const loadExternalScript = (src: string, id: string) => {
  return new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(id) as HTMLScriptElement | null;

    if (existingScript?.dataset.loaded === "true") {
      resolve();
      return;
    }

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Unable to load the PDF download library.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.referrerPolicy = "no-referrer";

    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };

    script.onerror = () => {
      reject(new Error("Unable to load the PDF download library."));
    };

    document.head.appendChild(script);
  });
};

const loadPdfLibraries = async () => {
  if (!window.html2canvas) {
    await loadExternalScript(HTML2CANVAS_CDN_URL, "html2canvas-cdn");
  }

  if (!window.jspdf?.jsPDF) {
    await loadExternalScript(JSPDF_CDN_URL, "jspdf-cdn");
  }

  if (!window.html2canvas || !window.jspdf?.jsPDF) {
    throw new Error("PDF download library is not available.");
  }

  return {
    html2canvas: window.html2canvas,
    jsPDF: window.jspdf.jsPDF,
  };
};

const sanitizeFileNamePart = (value: string) => {
  const cleaned = value
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return cleaned || "roadshow-quotation";
};

const getQuotationPdfFileName = (proposalNumber: string, companyName: string) => {
  const companyPart = sanitizeFileNamePart(companyName || "quotation");
  const proposalPart = sanitizeFileNamePart(proposalNumber);

  return `${companyPart}-${proposalPart}.pdf`;
};

export default function RoadshowQO() {
  const navigate = useNavigate();

//   const copyAndNavigate = async () => {
//     await navigator.clipboard.writeText(window.location.href);
//     navigate("/roadshowQO");
//   };
// // CORRECT - with async
// useEffect(() => {
//   const copyUrl = async () => {
//     await navigator.clipboard.writeText(window.location.href);
//   };
//   copyUrl();
// }, []);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [vehiclesError, setVehiclesError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [region, setRegion] = useState<RegionKey>("chennai");

  const [clientDetails, setClientDetails] = useState<ClientDetails>({
    clientName: "",
    companyName: "",
    contactNumber: "",
    email: "",
    campaignName: "",
    campaignLocation: "",
  });

  const [preparedByDetails, setPreparedByDetails] =
    useState<PreparedByDetails>(PREPARED_BY_DEFAULTS);

  const [quantity, setQuantity] = useState(1);
  const [promoterQuantity, setPromoterQuantity] = useState(1);
  const [days, setDays] = useState(10);
  const [kmLimit, setKmLimit] = useState(60);
  const [minimumDays, setMinimumDays] = useState(10);
  const [gstPercent, setGstPercent] = useState(18);

  const [pricingDetails, setPricingDetails] = useState<PricingDetails>({
    vehicleRate: 0,
    brandingCost: 0,
    rtoPermission: 0,
    promoterCost: 0,
    ledCost: 0,
    led55Cost: 0,
    powerBackup: 0,
    upDownCharge: 0,
  });

  const [includePromoter, setIncludePromoter] = useState(false);
  const [includeLed, setIncludeLed] = useState(false);
  const [includeLed55, setIncludeLed55] = useState(false);
  const [includePowerBackup, setIncludePowerBackup] = useState(false);

  const [uploadedLogo, setUploadedLogo] = useState("");
  const [signatureSource, setSignatureSource] = useState("");
  const [uploadedSignature, setUploadedSignature] = useState("");
  const [signatureCrop, setSignatureCrop] = useState<CropSelection>(
    DEFAULT_SIGNATURE_CROP,
  );
  const [isSelectingSignatureCrop, setIsSelectingSignatureCrop] =
    useState(false);
  const [signatureCropMessage, setSignatureCropMessage] = useState("");
  const [isPdfMode, setIsPdfMode] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [proposalDate] = useState(() => new Date());
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);
  const signatureCropImageFrameRef = useRef<HTMLDivElement | null>(null);
  const signatureCropStartRef = useRef<Pick<CropSelection, "x" | "y"> | null>(
    null,
  );

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        setIsLoadingVehicles(true);
        setVehiclesError("");

        const response = await fetch(`${VEHICLES_JSON_URL}?v=${Date.now()}`, {
        // const response = await fetch(`./vehicles_live.json?v=${Date.now()}`, {

          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load vehicles from cloud.");
        }

        const cloudVehicles = await response.json();

        if (!isVehicleArray(cloudVehicles)) {
          throw new Error("Cloud vehicles.json is not a valid vehicle array.");
        }

        setVehicles(cloudVehicles);

        const firstVehicle = cloudVehicles[0];

        if (firstVehicle) {
          setSelectedCategory(normalizeCategory(firstVehicle.category));
          setSelectedVehicleId(String(firstVehicle.id));
        }
      } catch (error) {
        setVehiclesError(
          error instanceof Error ? error.message : "Unable to load vehicles.",
        );
      } finally {
        setIsLoadingVehicles(false);
      }
    };

    loadVehicles();
  }, []);

  const categories = useMemo(() => {
    const normalized = new Set<string>(
      vehicles.map((vehicle) => normalizeCategory(vehicle.category)),
    );

    const ordered = CATEGORY_ORDER.filter((category) =>
      normalized.has(category),
    );
    const extras = Array.from(normalized).filter(
      (category) => !CATEGORY_ORDER.includes(category),
    );

    return [...ordered, ...extras];
  }, [vehicles]);

  const categoryVehicles = useMemo(() => {
    return vehicles.filter(
      (vehicle) => normalizeCategory(vehicle.category) === selectedCategory,
    );
  }, [vehicles, selectedCategory]);

  const selectedVehicle = useMemo(() => {
    return vehicles.find((vehicle) => String(vehicle.id) === selectedVehicleId);
  }, [vehicles, selectedVehicleId]);

  const proposalNumber = useMemo(() => {
    const dateKey = proposalDate.toISOString().slice(0, 10).replace(/-/g, "");
    const vehicleKey = selectedVehicleId || "NEW";
    return `ADN-RS-${dateKey}-${vehicleKey}`;
  }, [proposalDate, selectedVehicleId]);

  const validUntilDate = useMemo(() => {
    return addDays(proposalDate, COMPANY_DETAILS.validityDays);
  }, [proposalDate]);

  useEffect(() => {
    if (!selectedVehicle) return;

    const nextPricing = getDefaultPricing(selectedVehicle, region);

    setPricingDetails(nextPricing);
    setKmLimit(60);
    setMinimumDays(10);
  }, [selectedVehicle, region]);

  useEffect(() => {
    const handleAfterPrint = () => setIsPdfMode(false);

    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const rtoBillingMonths = useMemo(() => {
    return getRtoBillingMonths(days);
  }, [days]);

  const quoteLineItems = useMemo<QuoteLineItem[]>(() => {
    // const rtoMonthRawValue = days / RTO_PERMISSION_VALIDITY_DAYS;
    // const rtoMonthText = rtoMonthRawValue.toFixed(2);
    const effectivePowerBackupRate =
      includeLed55 && pricingDetails.powerBackup <= 0
        ? POWER_BACKUP_ADDON_RATE_PER_DAY
        : pricingDetails.powerBackup;

    const items: QuoteLineItem[] = [
      {
        label: "Vehicle Rental",
        description: selectedVehicle?.name || "Selected campaign vehicle",
        rateLabel: `${formatPrice(pricingDetails.vehicleRate)} / day`,
        periodLabel: `${days} day(s)`,
        quantityLabel: `${quantity}`,
        formulaLabel: `${formatPrice(pricingDetails.vehicleRate)} × ${days} day(s) × ${quantity} vehicle(s)`,
        amount: pricingDetails.vehicleRate * quantity * days,
      },
      {
        label: "Branding Cost",
        description: `${getRegionLabel(region)} vehicle branding production and application support`,
        rateLabel: `${formatPrice(pricingDetails.brandingCost)} / vehicle`,
        periodLabel: "One-time",
        quantityLabel: `${quantity} `,
        formulaLabel: `${formatPrice(pricingDetails.brandingCost)} × ${quantity} vehicle(s)`,
        amount: pricingDetails.brandingCost * quantity,
      },
      {
        label: "RTO Permission",
        description: `${getRegionLabel(region)} permission charged for every 28 days. ${days} day(s) usage considered as ${rtoBillingMonths} month(s).`,
        rateLabel: `${formatPrice(pricingDetails.rtoPermission)} / 28 days / vehicle`,
        periodLabel: `${rtoBillingMonths} billing month(s)`,
        quantityLabel: `${quantity}`,
        formulaLabel: `${formatPrice(pricingDetails.rtoPermission)} × ${rtoBillingMonths} month(s) × ${quantity} vehicle(s)`,
        amount: pricingDetails.rtoPermission * rtoBillingMonths * quantity,
      },
    ];

    if (pricingDetails.upDownCharge > 0) {
      items.push({
        label: "Up & Down Charge",
        description: "Campaign vehicle movement support",
        rateLabel: `${formatPrice(pricingDetails.upDownCharge)} / vehicle`,
        periodLabel: "One-time",
        quantityLabel: `${quantity} vehicle(s)`,
        formulaLabel: `${formatPrice(pricingDetails.upDownCharge)} × ${quantity} vehicle(s)`,
        amount: pricingDetails.upDownCharge * quantity,
      });
    }

    if (includePromoter) {
      items.push({
        label: "Promoter Support",
        description: "On-ground campaign promoter support",
        rateLabel: `${formatPrice(pricingDetails.promoterCost)} / day`,
        periodLabel: `${days} day(s)`,
        quantityLabel: `${promoterQuantity}`,
        formulaLabel: `${formatPrice(pricingDetails.promoterCost)} × ${days} day(s) × ${promoterQuantity} promoter(s)`,
        amount: pricingDetails.promoterCost * promoterQuantity * days,
      });
    }

    if (includeLed) {
      items.push({
        label: '43" LED TV',
        description: '43" LED TV add-on for campaign display',
        rateLabel: `${formatPrice(pricingDetails.ledCost)} / day`,
        periodLabel: `${days} day(s)`,
        quantityLabel: `${quantity} `,
        formulaLabel: `${formatPrice(pricingDetails.ledCost)} × ${days} day(s) × ${quantity} unit(s)`,
        amount: pricingDetails.ledCost * quantity * days,
      });
    }

    if (includeLed55) {
      items.push({
        label: '55" LED TV',
        description: '55" LED TV add-on for premium campaign display',
        rateLabel: `${formatPrice(pricingDetails.led55Cost)} / day`,
        periodLabel: `${days} day(s)`,
        quantityLabel: `${quantity} `,
        formulaLabel: `${formatPrice(pricingDetails.led55Cost)} × ${days} day(s) × ${quantity} unit(s)`,
        amount: pricingDetails.led55Cost * quantity * days,
      });
    }

    if (includePowerBackup || includeLed55) {
      items.push({
        label: "Power Backup",
        description: includeLed55
          ? 'Mandatory power backup required for the selected 55" LED TV add-on.'
          : "Power backup add-on for campaign support",
        rateLabel: `${formatPrice(effectivePowerBackupRate)} / day`,
        periodLabel: `${days} day(s)`,
        quantityLabel: `${quantity}`,
        formulaLabel: `${formatPrice(effectivePowerBackupRate)} × ${days} day(s) × ${quantity} unit(s)`,
        amount: effectivePowerBackupRate * quantity * days,
      });
    }

    return items.filter((item) => item.amount > 0);
  }, [
    selectedVehicle,
    pricingDetails,
    quantity,
    promoterQuantity,
    days,
    region,
    includePromoter,
    includeLed,
    includeLed55,
    includePowerBackup,
    rtoBillingMonths,
  ]);

  const subtotal = useMemo(() => {
    return quoteLineItems.reduce((total, item) => total + item.amount, 0);
  }, [quoteLineItems]);

  const gstAmount = useMemo(() => {
    return subtotal * (gstPercent / 100);
  }, [subtotal, gstPercent]);

  const grandTotal = subtotal + gstAmount;

  // const includedServices = useMemo(() => {
  //   const baseIncluded = selectedVehicle?.included?.length
  //     ? selectedVehicle.included
  //     : [
  //         "Vehicle rent",
  //         "Driver bata, food and accommodation",
  //         `Fuel within ${kmLimit} km/day`,
  //         "Basic campaign movement",
  //       ];

  //   return Array.from(new Set(baseIncluded));
  // }, [selectedVehicle, kmLimit]);

  const selectedAddOns = useMemo(() => {
    const addOns: string[] = [];

    if (includePromoter) {
      addOns.push(`${promoterQuantity} promoter(s)`);
    }

    if (includeLed) {
      addOns.push('43" LED TV');
    }

    if (includeLed55) {
      addOns.push('55" LED TV');
    }

    if (includePowerBackup || includeLed55) {
      addOns.push(
        includeLed55 ? 'Power backup (mandatory for 55" LED TV)' : "Power backup",
      );
    }

    return addOns.length ? addOns : ["No optional add-ons selected"];
  }, [
    includePromoter,
    includeLed,
    includeLed55,
    includePowerBackup,
    promoterQuantity,
  ]);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);

    const firstVehicle = vehicles.find(
      (vehicle) => normalizeCategory(vehicle.category) === category,
    );

    if (firstVehicle) {
      setSelectedVehicleId(String(firstVehicle.id));
    }
  };

  const handleClientChange = (field: keyof ClientDetails, value: string) => {
    setClientDetails((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handlePreparedByChange = (
    field: keyof PreparedByDetails,
    value: string,
  ) => {
    setPreparedByDetails((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handlePricingChange = (field: keyof PricingDetails, value: string) => {
    const numericValue = Number(value);
    const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
    const nextValue =
      field === "powerBackup" && includeLed55 && safeValue <= 0
        ? POWER_BACKUP_ADDON_RATE_PER_DAY
        : safeValue;

    setPricingDetails((current) => ({
      ...current,
      [field]: nextValue,
    }));
  };

  const handleResetPricing = () => {
    setPricingDetails(getDefaultPricing(selectedVehicle, region));
    setIncludePromoter(false);
    setIncludeLed(false);
    setIncludeLed55(false);
    setIncludePowerBackup(false);
    setPromoterQuantity(1);
  };

  const handleLedToggle = (checked: boolean) => {
    setIncludeLed(checked);

    if (checked) {
      setPricingDetails((current) => ({
        ...current,
        ledCost: LED_TV_ADDON_RATE_PER_DAY,
      }));
    }
  };

  const handleLed55Toggle = (checked: boolean) => {
    setIncludeLed55(checked);

    if (checked) {
      setIncludePowerBackup(true);
      setPricingDetails((current) => ({
        ...current,
        led55Cost:
          current.led55Cost > 0
            ? current.led55Cost
            : LED_55_TV_ADDON_RATE_PER_DAY,
        powerBackup:
          current.powerBackup > 0
            ? current.powerBackup
            : POWER_BACKUP_ADDON_RATE_PER_DAY,
      }));
    }
  };

  const handlePowerBackupToggle = (checked: boolean) => {
    if (includeLed55 && !checked) {
      setIncludePowerBackup(true);
      return;
    }

    setIncludePowerBackup(checked);

    if (checked) {
      setPricingDetails((current) => ({
        ...current,
        powerBackup:
          current.powerBackup > 0
            ? current.powerBackup
            : POWER_BACKUP_ADDON_RATE_PER_DAY,
      }));
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setUploadedLogo(imageUrl);
  };

  const getSignatureCropPoint = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const cropFrame = signatureCropImageFrameRef.current || event.currentTarget;
    const bounds = cropFrame.getBoundingClientRect();
    const relativeX = ((event.clientX - bounds.left) / bounds.width) * 100;
    const relativeY = ((event.clientY - bounds.top) / bounds.height) * 100;

    return {
      x: normalizeCropValue(relativeX),
      y: normalizeCropValue(relativeY),
    };
  };

  const handleSignatureCropPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!signatureSource) return;

    const point = getSignatureCropPoint(event);
    signatureCropStartRef.current = point;
    setSignatureCrop({
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    });
    setSignatureCropMessage("");
    setIsSelectingSignatureCrop(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSignatureCropPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!isSelectingSignatureCrop || !signatureCropStartRef.current) return;

    const point = getSignatureCropPoint(event);
    setSignatureCrop(normalizeCropFromPoints(signatureCropStartRef.current, point));
  };

  const handleSignatureCropPointerUp = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!signatureCropStartRef.current) return;

    const point = getSignatureCropPoint(event);
    const nextCrop = normalizeCropFromPoints(signatureCropStartRef.current, point);

    if (
      nextCrop.width < MIN_SIGNATURE_CROP_SIZE ||
      nextCrop.height < MIN_SIGNATURE_CROP_SIZE
    ) {
      setSignatureCrop(DEFAULT_SIGNATURE_CROP);
      setSignatureCropMessage(
        "Drag across the image to select the signature area.",
      );
    } else {
      setSignatureCrop(nextCrop);
      setSignatureCropMessage("Area selected. Click Use Selected Area.");
    }

    signatureCropStartRef.current = null;
    setIsSelectingSignatureCrop(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleSignatureUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setSignatureCropMessage("Preparing signature preview...");

      const normalizedImage = await normalizeImageFileToDataUrl(file);

      setSignatureSource(normalizedImage);
      setUploadedSignature("");
      setSignatureCrop(DEFAULT_SIGNATURE_CROP);
      setSignatureCropMessage(
        "Preview uploaded. Drag on the photo to select only the signature area.",
      );
    } catch (error) {
      setSignatureSource("");
      setUploadedSignature("");
      setSignatureCrop(DEFAULT_SIGNATURE_CROP);
      setSignatureCropMessage(
        error instanceof Error
          ? error.message
          : "Unable to prepare the selected signature image.",
      );
    }
  };

  const handleApplySignatureCrop = async () => {
    if (!signatureSource) return;

    if (
      signatureCrop.width < MIN_SIGNATURE_CROP_SIZE ||
      signatureCrop.height < MIN_SIGNATURE_CROP_SIZE
    ) {
      setSignatureCropMessage(
        "Please select a larger signature area before applying.",
      );
      return;
    }

    try {
      const image = await loadImageElement(signatureSource);
      const sourceX = Math.round((signatureCrop.x / 100) * image.naturalWidth);
      const sourceY = Math.round((signatureCrop.y / 100) * image.naturalHeight);
      const sourceWidth = Math.max(
        1,
        Math.round((signatureCrop.width / 100) * image.naturalWidth),
      );
      const sourceHeight = Math.max(
        1,
        Math.round((signatureCrop.height / 100) * image.naturalHeight),
      );

      const canvas = document.createElement("canvas");
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Unable to crop signature image.");
      }

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        sourceWidth,
        sourceHeight,
      );

      setUploadedSignature(canvasToPngDataUrl(canvas));
      setSignatureCropMessage(
        "Selected area applied. This cropped signature will appear in the quotation footer and downloaded PDF.",
      );
    } catch (error) {
      setUploadedSignature("");
      setSignatureCropMessage(
        error instanceof Error
          ? error.message
          : "Unable to crop the selected signature area.",
      );
    }
  };

  const handleRemoveSignature = () => {
    setSignatureSource("");
    setUploadedSignature("");
    setSignatureCrop(DEFAULT_SIGNATURE_CROP);
    setSignatureCropMessage("");

    if (signatureInputRef.current) {
      signatureInputRef.current.value = "";
    }
  };

  const prepareAndPrintProposal = async () => {
    setIsPdfMode(true);
    setPdfError("");

    await waitForNextPaint();
    await waitForImagesToLoad(".printableArea img");

    window.print();
  };

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;

    const pageElements = Array.from(
      document.querySelectorAll<HTMLElement>(".printableArea .pdfPage"),
    );

    if (!pageElements.length) {
      setPdfError("Unable to find the quotation pages for PDF download.");
      return;
    }

    try {
      setPdfError("");
      setIsGeneratingPdf(true);
      setIsPdfMode(true);
      document.body.classList.add("pdfExporting");

      await waitForNextPaint();
      await waitForImagesToLoad(".printableArea img");
      await (
        document as Document & {
          fonts?: {
            ready?: Promise<unknown>;
          };
        }
      ).fonts?.ready?.catch(() => undefined);

      const { html2canvas, jsPDF } = await loadPdfLibraries();

      await waitForNextPaint();

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      for (const [pageIndex, pageElement] of pageElements.entries()) {
        const canvas = await html2canvas(pageElement, {
          backgroundColor: "#ffffff",
          logging: false,
          scale: Math.max(3, window.devicePixelRatio || 1),
          useCORS: true,
          allowTaint: false,
          width: pageElement.offsetWidth,
          height: pageElement.offsetHeight,
          windowWidth: pageElement.offsetWidth,
          windowHeight: pageElement.offsetHeight,
          scrollX: 0,
          scrollY: 0,
        });

        const imageData = canvas.toDataURL("image/png");

        if (pageIndex > 0) {
          pdf.addPage("a4", "portrait");
        }

        pdf.addImage(imageData, "PNG", 0, 0, 210, 297);
      }

      pdf.save(getQuotationPdfFileName(proposalNumber, clientDetails.companyName));
    } catch (error) {
      console.error(error);
      setPdfError(
        error instanceof Error
          ? `PDF download failed: ${error.message}`
          : "PDF download failed. Please try Print A4 and choose Save as PDF.",
      );
    } finally {
      document.body.classList.remove("pdfExporting");
      setIsPdfMode(false);
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadJson = async () => {
    const response = await fetch(`${VEHICLES_JSON_URL}?v=${Date.now()}`, {
      cache: "no-store",
    });

    if (!response.ok) return;

    const cloudVehicles = await response.json();

    if (isVehicleArray(cloudVehicles)) {
      downloadJsonFile(cloudVehicles, "vehicles.json");
    }
  };

  const displayLogo = uploadedLogo || LOGO_SRC;
  // Use the compact A4 layout only when the commercial table is actually dense.
  // A signature alone should not shrink the full quotation, because that creates
  // unnecessary empty space at the bottom of the preview/PDF.
  const isCompactProposal = quoteLineItems.length >= 6;

  return (
    <div className={`qoPage ${isPdfMode ? "pdfMode" : ""}`}>
      <header className="qoHeader noPrint">
        <div className="qoHeaderInner">
          <div className="qoBrand">
            <div className="qoBrandLogo">
              <img src={LOGO_SRC} alt="Adinn" />
            </div>

            <div>
              <h1>ADINN</h1>
              <p>Roadshow Quotation Generator</p>
            </div>
          </div>

          <div className="qoHeaderActions">
            <button type="button" onClick={() => logoInputRef.current?.click()}>
              Upload Logo
            </button>

            <button
              type="button"
              onClick={prepareAndPrintProposal}
              disabled={isGeneratingPdf}
            >
              Print A4
            </button>

            <button
              type="button"
              className="primaryAction"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? "Preparing PDF..." : "Download PDF"}
            </button>

            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              hidden
            />
          </div>
        </div>
      </header>

      <main className="qoMain">
        <section className="qoFormColumn noPrint">
          {vehiclesError && <div className="qoError">{vehiclesError}</div>}
          {pdfError && <div className="qoError">{pdfError}</div>}

          <section className="qoCard">
            <h2>1. Vehicle Category</h2>

            {isLoadingVehicles ? (
              <div className="qoLoading">Loading vehicle categories...</div>
            ) : (
              <div className="qoOptionGrid three">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={`qoSelectCard ${selectedCategory === category ? "active" : ""
                      }`}
                    onClick={() => handleCategorySelect(category)}
                  >
                    <strong>{category}</strong>
                    <span>
                      {category === "Flex Branding"
                        ? "Traditional flex-branded vehicles."
                        : category === "Hybrid LED + Flex"
                          ? "LED screen with flex branding."
                          : "High-impact full LED vehicles."}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="qoCard">
            <h2>2. Select Vehicle</h2>

            {isLoadingVehicles ? (
              <div className="qoLoading">Loading vehicles...</div>
            ) : (
              <div className="qoOptionGrid two">
                {categoryVehicles.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    type="button"
                    className={`qoSelectCard ${selectedVehicleId === String(vehicle.id) ? "active" : ""
                      }`}
                    onClick={() => setSelectedVehicleId(String(vehicle.id))}
                  >
                    <strong>{vehicle.name}</strong>
                    <span>
                      {formatPrice(vehicle.pricePerDay)} /day · {kmLimit} km/day
                      · Min {minimumDays}d
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="qoCard">
            <h2>3. Client Details</h2>

            <div className="qoInputGrid two">
              <label>
                Company Name
                <input
                  type="text"
                  value={clientDetails.companyName}
                  onChange={(event) =>
                    handleClientChange("companyName", event.target.value)
                  }
                />
              </label>
              <label>
                Client Name
                <input
                  type="text"
                  value={clientDetails.clientName}
                  onChange={(event) =>
                    handleClientChange("clientName", event.target.value)
                  }
                />
              </label>

              <label>
                Contact Number
                <input
                  type="tel"
                  value={clientDetails.contactNumber}
                  onChange={(event) =>
                    handleClientChange("contactNumber", event.target.value)
                  }
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={clientDetails.email}
                  onChange={(event) =>
                    handleClientChange("email", event.target.value)
                  }
                />
              </label>

              <label>
                Campaign Name
                <input
                  type="text"
                  value={clientDetails.campaignName}
                  onChange={(event) =>
                    handleClientChange("campaignName", event.target.value)
                  }
                />
              </label>

              <label>
                Campaign Location
                <input
                  type="text"
                  value={clientDetails.campaignLocation}
                  onChange={(event) =>
                    handleClientChange("campaignLocation", event.target.value)
                  }
                />
              </label>
            </div>
          </section>

          <section className="qoCard">
            <h2>4. Prepared By Details</h2>

            <div className="qoInputGrid two">
              <label>
                Company Name
                <input
                  type="text"
                  value={preparedByDetails.companyName}
                  onChange={(event) =>
                    handlePreparedByChange("companyName", event.target.value)
                  }
                />
              </label>

              <label>
                Staff Name
                <input
                  type="text"
                  value={preparedByDetails.staffName}
                  onChange={(event) =>
                    handlePreparedByChange("staffName", event.target.value)
                  }
                />
              </label>

              <label>
                Staff Phone Number
                <input
                  type="tel"
                  value={preparedByDetails.staffPhone}
                  onChange={(event) =>
                    handlePreparedByChange("staffPhone", event.target.value)
                  }
                />
              </label>

              <label>
                Email ID
                <input
                  type="email"
                  value={preparedByDetails.email}
                  onChange={(event) =>
                    handlePreparedByChange("email", event.target.value)
                  }
                />
              </label>

              <label className="fullWidth">
                Address
                <textarea
                  value={preparedByDetails.address}
                  placeholder="Enter address"
                  onChange={(event) =>
                    handlePreparedByChange("address", event.target.value)
                  }
                />
              </label>

              <div className="signatureUploadField fullWidth">
                <div>
                  <strong>Digital Signature</strong>
                  <p>
                    Upload a signature image only when you want the Authorised
                    Signatory block to appear in the quotation footer.
                  </p>
                </div>

                <div className="signatureUploadActions">
                  <button
                    type="button"
                    className="smallBtn"
                    onClick={() => signatureInputRef.current?.click()}
                  >
                    {signatureSource || uploadedSignature
                      ? "Change Signature"
                      : "Upload Signature"}
                  </button>

                  {(signatureSource || uploadedSignature) && (
                    <button
                      type="button"
                      className="smallBtn dangerBtn"
                      onClick={handleRemoveSignature}
                    >
                      Remove
                    </button>
                  )}

                  <input
                    ref={signatureInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureUpload}
                    hidden
                  />
                </div>

                {signatureSource && (
                  <div className="signatureCropPanel">
                    <div className="signatureCropHeader">
                      <strong>Select signature area</strong>
                      <span>
                        Drag exactly over the signature. The same selected area
                        will appear in the live quotation and PDF.
                      </span>
                    </div>

                    <div className="signatureCropStage">
                      <div
                        ref={signatureCropImageFrameRef}
                        className="signatureCropImageFrame"
                        role="presentation"
                        onPointerDown={handleSignatureCropPointerDown}
                        onPointerMove={handleSignatureCropPointerMove}
                        onPointerUp={handleSignatureCropPointerUp}
                        onPointerCancel={handleSignatureCropPointerUp}
                      >
                        <img src={signatureSource} alt="Signature crop preview" />

                        <span
                          className="signatureCropBox"
                          style={{
                            left: `${signatureCrop.x}%`,
                            top: `${signatureCrop.y}%`,
                            width: `${signatureCrop.width}%`,
                            height: `${signatureCrop.height}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="signatureCropActions">
                      <button
                        type="button"
                        className="smallBtn"
                        onClick={handleApplySignatureCrop}
                      >
                        Use Selected Area
                      </button>

                      <span>{signatureCropMessage}</span>
                    </div>
                  </div>
                )}

                {uploadedSignature && (
                  <div className="signatureUploadPreview">
                    <img
                      src={uploadedSignature}
                      alt="Cropped digital signature preview"
                    />
                    <span>
                      Cropped signature is now shown in the quotation footer.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="qoCard">
            <h2>5. Region & Campaign</h2>

            <div className="qoInputGrid two">
              <label>
                Region
                <select
                  value={region}
                  onChange={(event) =>
                    setRegion(event.target.value as RegionKey)
                  }
                >
                  <option value="chennai">Chennai</option>
                  <option value="rotn">ROTN</option>
                  <option value="kerala">Kerala</option>
                  <option value="otherStates">Other States</option>
                </select>
              </label>

              <label>
                No. of Vehicles
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(clampNumber(event.target.value, 1))
                  }
                />
              </label>

              <label>
                No. of Days
                <input
                  type="number"
                  min={minimumDays}
                  value={days}
                  onChange={(event) =>
                    setDays(clampNumber(event.target.value, minimumDays))
                  }
                />
              </label>

              <label>
                Up & Down Charge
                <input
                  type="number"
                  min="0"
                  value={pricingDetails.upDownCharge}
                  onChange={(event) =>
                    handlePricingChange("upDownCharge", event.target.value)
                  }
                />
              </label>

              <label>
                GST %
                <input
                  type="number"
                  min="0"
                  value={gstPercent}
                  onChange={(event) =>
                    setGstPercent(clampNumber(event.target.value, 0))
                  }
                />
              </label>
            </div>
          </section>

          <section className="qoCard">
            <div className="qoSectionHeader">
              <div>
                <h2>6. Pricing Customization</h2>
                <p>
                  Override any default price for this quotation. Changes here do
                  not affect master pricing.
                </p>
              </div>

              <button
                type="button"
                className="smallBtn"
                onClick={handleResetPricing}
              >
                Reset Default Pricing
              </button>
            </div>

            <div className="qoInputGrid two">
              <label>
                Per Day Vehicle Rate
                <div className="moneyInput">
                  <span>Rs.</span>
                  <input
                    type="number"
                    value={pricingDetails.vehicleRate}
                    onChange={(event) =>
                      handlePricingChange("vehicleRate", event.target.value)
                    }
                  />
                </div>
                <small>
                  Default: {formatPrice(selectedVehicle?.pricePerDay || 0)}
                </small>
              </label>

              <label>
                Branding Cost ({getRegionLabel(region)})
                <div className="moneyInput">
                  <span>Rs.</span>
                  <input
                    type="number"
                    value={pricingDetails.brandingCost}
                    onChange={(event) =>
                      handlePricingChange("brandingCost", event.target.value)
                    }
                  />
                </div>
                <small>
                  Default:{" "}
                  {formatPrice(
                    getDefaultPricing(selectedVehicle, region).brandingCost,
                  )}
                </small>
              </label>

              <label>
                RTO Permission ({getRegionLabel(region)})
                <div className="moneyInput">
                  <span>Rs.</span>
                  <input
                    type="number"
                    value={pricingDetails.rtoPermission}
                    onChange={(event) =>
                      handlePricingChange("rtoPermission", event.target.value)
                    }
                  />
                </div>
                <small>
                  Default:{" "}
                  {formatPrice(
                    getDefaultPricing(selectedVehicle, region).rtoPermission,
                  )}
                </small>
              </label>

              <label>
                Promoter Cost / Day
                <div className="moneyInput">
                  <span>Rs.</span>
                  <input
                    type="number"
                    value={pricingDetails.promoterCost}
                    onChange={(event) =>
                      handlePricingChange("promoterCost", event.target.value)
                    }
                  />
                </div>
                <small>
                  Default:{" "}
                  {formatPrice(
                    getDefaultPricing(selectedVehicle, region).promoterCost,
                  )}
                </small>
              </label>

              <label>
                43" LED TV / Day
                <div className="moneyInput">
                  <span>Rs.</span>
                  <input
                    type="number"
                    value={pricingDetails.ledCost}
                    onChange={(event) =>
                      handlePricingChange("ledCost", event.target.value)
                    }
                  />
                </div>
                <small>
                  Default:{" "}
                  {formatPrice(
                    getDefaultPricing(selectedVehicle, region).ledCost,
                  )}
                </small>
              </label>

              <label>
                55" LED TV / Day
                <div className="moneyInput">
                  <span>Rs.</span>
                  <input
                    type="number"
                    value={pricingDetails.led55Cost}
                    onChange={(event) =>
                      handlePricingChange("led55Cost", event.target.value)
                    }
                  />
                </div>
                <small>
                  Default:{" "}
                  {formatPrice(
                    getDefaultPricing(selectedVehicle, region).led55Cost,
                  )}
                </small>
              </label>

              <label>
                Power Backup / Day
                <div className="moneyInput">
                  <span>Rs.</span>
                  <input
                    type="number"
                    value={pricingDetails.powerBackup}
                    onChange={(event) =>
                      handlePricingChange("powerBackup", event.target.value)
                    }
                  />
                </div>
                <small>
                  Default:{" "}
                  {formatPrice(
                    getDefaultPricing(selectedVehicle, region).powerBackup,
                  )}
                </small>
              </label>
            </div>
          </section>

          <section className="qoCard">
            <h2>7. Add Ons</h2>

            <div className="qoAddonList">
              <label className="qoAddon">
                <input
                  type="checkbox"
                  checked={includePromoter}
                  onChange={(event) => setIncludePromoter(event.target.checked)}
                />
                <span>
                  Include Promoter ({formatPrice(pricingDetails.promoterCost)}
                  /day)
                </span>
              </label>

              {includePromoter && (
                <div className="qoInputGrid two">
                  <label>
                    No. of Promoters
                    <input
                      type="number"
                      min="1"
                      value={promoterQuantity}
                      onChange={(event) =>
                        setPromoterQuantity(clampNumber(event.target.value, 1))
                      }
                    />
                  </label>
                </div>
              )}

              <label className="qoAddon">
                <input
                  type="checkbox"
                  checked={includeLed}
                  onChange={(event) => handleLedToggle(event.target.checked)}
                />
                <span>
                  Include 43" LED TV ({formatPrice(pricingDetails.ledCost)}
                  /day)
                </span>
              </label>

              <label className="qoAddon">
                <input
                  type="checkbox"
                  checked={includeLed55}
                  onChange={(event) => handleLed55Toggle(event.target.checked)}
                />
                <span>
                  Include 55" LED TV ({formatPrice(pricingDetails.led55Cost)}
                  /day)
                </span>
              </label>

              <label className={`qoAddon ${includeLed55 ? "locked" : ""}`}>
                <input
                  type="checkbox"
                  checked={includePowerBackup || includeLed55}
                  disabled={includeLed55}
                  onChange={(event) =>
                    handlePowerBackupToggle(event.target.checked)
                  }
                />
                <span>
                  Include Power Backup (
                  {formatPrice(
                    pricingDetails.powerBackup || POWER_BACKUP_ADDON_RATE_PER_DAY,
                  )}
                  /day)
                  {includeLed55 ? " — mandatory with 55\" LED TV" : ""}
                </span>
              </label>

              {includeLed55 && (
                <p className="qoAddonNote">
                  55&quot; LED TV needs stable power, so Power Backup is
                  automatically enabled and shown as a separate quotation line
                  item.
                </p>
              )}
            </div>

            <button
              type="button"
              className="jsonDownloadBtn"
              onClick={handleDownloadJson}
            >
              Download Vehicle JSON
            </button>
          </section>
        </section>

        <aside className="qoPreviewColumn">
          <div
            className={`proposalBook printableArea ${isCompactProposal ? "denseQuoteBook" : ""} ${uploadedSignature ? "hasSignatureQuote" : "noSignatureQuote"}`}
          >
            <section className="proposalDocument pdfPage quotePageOne">
              <header className="quoteTopBar">
                <div className="quoteBrandBlock">
                  <div className="quoteLogoBox">
                    <img src={displayLogo} alt="Adinn logo" />
                  </div>

                  <div>
                    <p className="quoteCompanyName">{COMPANY_DETAILS.name}</p>
                    <h1>{COMPANY_DETAILS.title}</h1>
                  </div>
                </div>

                <div className="quoteMetaBox">
                  <div>
                    <span>Quotation No.</span>
                    <strong>{proposalNumber}</strong>
                  </div>
                  <div>
                    <span>Date</span>
                    <strong>{formatDate(proposalDate)}</strong>
                  </div>
                  <div>
                    <span>Valid Until</span>
                    <strong>{formatDate(validUntilDate)}</strong>
                  </div>
                </div>
              </header>

              <section className="quotePartyGrid">
                <div className="quotePartyCard">
                  <p>Quotation To</p>
                  <h2>{clientDetails.companyName || "-"}</h2>
                  <span>{clientDetails.clientName || "-"}</span>
                  <span>{clientDetails.contactNumber || "-"}</span>
                  <span>{clientDetails.email || "-"}</span>
                </div>

                <div className="quotePartyCard right">
                  <p>Prepared By</p>
                  <h2>{preparedByDetails.companyName || "-"}</h2>
                  <span>{preparedByDetails.staffName || "-"}</span>
                  <span>{preparedByDetails.staffPhone || "-"}</span>
                  <span>{preparedByDetails.email || "-"}</span>
                  <span>{preparedByDetails.address || "-"}</span>
                </div>
              </section>

              <section className="quoteCampaignCard">
                <div className="quoteSectionTitle">
                  <span>Campaign Details</span>
                  <strong>{selectedVehicle?.name || "Selected Vehicle"}</strong>
                </div>

                <div className="quoteInfoGrid">
                  <div>
                    <span>Campaign</span>
                    <strong>{clientDetails.campaignName || "-"}</strong>
                  </div>
                  <div>
                    <span>Location</span>
                    <strong>{clientDetails.campaignLocation || "-"}</strong>
                  </div>
                  <div>
                    <span>Region</span>
                    <strong>{getRegionLabel(region)}</strong>
                  </div>
                  <div>
                    <span>No. of Vehicles</span>
                    <strong>{quantity}</strong>
                  </div>
                  <div>
                    <span>Campaign Duration</span>
                    <strong>{days} days</strong>
                  </div>
                  <div>
                    <span>Daily KM Limit</span>
                    <strong>{kmLimit} km/day</strong>
                  </div>
                  <div>
                    <span>Minimum Booking</span>
                    <strong>{minimumDays} days</strong>
                  </div>
                  <div>
                    <span>Add-ons</span>
                    <strong>{selectedAddOns.join(", ")}</strong>
                  </div>
                </div>
              </section>

              <section className="quoteTableCard pageOneTableCard">
                <div className="quoteTableHead">
                  <div>
                    <span>Commercial Quotation</span>
                    <p>
                      {includeLed55
                        ? `55" LED TV requires power backup. Power Backup is added automatically at ${formatPrice(
                          pricingDetails.powerBackup || POWER_BACKUP_ADDON_RATE_PER_DAY,
                        )} / day and included in the total.`
                        : "All values are in INR. Final booking is subject to vehicle availability."}
                    </p>
                  </div>

                  <div className="quoteGrandBadge">
                    <span style={{ color: "white" }}>Grand Total</span>
                    <strong>{formatPrice(grandTotal)}</strong>
                  </div>
                </div>

                <table className="quotationTable">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Particulars</th>
                      <th>Rate / Unit</th>
                      <th>Days / Period</th>
                      <th>Quantity</th>
                      <th>Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {quoteLineItems.map((item, index) => (
                      <tr key={`${item.label}-${item.description}`}>
                        <td>{index + 1}</td>
                        <td>
                          <div className="quoteParticularBlock">
                            <strong className="quoteParticularName">
                              {item.label}
                            </strong>
                            <p className="quoteParticularDescription">
                              {item.description}
                            </p>
                          </div>
                        </td>
                        <td>{item.rateLabel}</td>
                        <td>{item.periodLabel}</td>
                        <td>{item.quantityLabel}</td>
                        <td>{formatPrice(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>

                  <tfoot>
                    <tr>
                      <td colSpan={5}>Subtotal</td>
                      <td>{formatPrice(subtotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={5}>GST @ {gstPercent}%</td>
                      <td>{formatPrice(gstAmount)}</td>
                    </tr>
                    <tr className="quotationGrandRow">
                      <td colSpan={5}>Grand Total</td>
                      <td>{formatPrice(grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </section>

              <div className="quotePageNumber">Page 1 of 2</div>
            </section>

            <section className="proposalDocument pdfPage quotePageTwo">
              {/* <header className="quoteTopBar quoteTopBarSmall">
                <div className="quoteBrandBlock">
                  <div className="quoteLogoBox">
                    <img src={displayLogo} alt="Adinn logo" />
                  </div>

                  <div>
                    <p className="quoteCompanyName">{COMPANY_DETAILS.name}</p>
                    <h1>Booking Assurance & Summary</h1>
                  </div>
                </div>

                <div className="quoteMetaBox">
                  <div>
                    <span>Quotation No.</span>
                    <strong>{proposalNumber}</strong>
                  </div>
                  <div>
                    <span>Date</span>
                    <strong>{formatDate(proposalDate)}</strong>
                  </div>
                  <div>
                    <span>Valid Until</span>
                    <strong>{formatDate(validUntilDate)}</strong>
                  </div>
                </div>
              </header>

              <section className="quoteSummaryPanel">
                <div className="quoteSummaryIntro">
                  <span>Quotation Summary</span>
                  <h2>{selectedVehicle?.name || "Selected Vehicle"}</h2>
                  <p>
                    Campaign plan for {clientDetails.companyName || "the client"} in {getRegionLabel(region)}.
                    This page keeps the booking terms, payment note and signatory cleanly separated from the commercial table.
                  </p>
                </div>

                <div className="quoteSummaryGrid">
                  <div>
                    <span>Subtotal</span>
                    <strong>{formatPrice(subtotal)}</strong>
                  </div>
                  <div>
                    <span>GST @ {gstPercent}%</span>
                    <strong>{formatPrice(gstAmount)}</strong>
                  </div>
                  <div className="quoteSummaryGrand">
                    <span>Grand Total</span>
                    <strong>{formatPrice(grandTotal)}</strong>
                  </div>
                  <div>
                    <span>Advance Required</span>
                    <strong>{formatPrice(grandTotal * 0.5)}</strong>
                  </div>
                </div>
              </section>

              <section className="quoteScopePanel">
                <div className="quoteScopeColumn">
                  <h3>Included Services</h3>
                  <ul>
                    {includedServices.map((service) => (
                      <li key={service}>{service}</li>
                    ))}
                  </ul>
                </div>

                <div className="quoteScopeColumn">
                  <h3>Selected Add-ons</h3>
                  <ul>
                    {selectedAddOns.map((addOn) => (
                      <li key={addOn}>{addOn}</li>
                    ))}
                  </ul>
                </div>
              </section> */}

              <section className="quoteTermsPanel">
                <div className="quoteTermsHeader">
                  <div>
                    <span>Booking Assurance</span>
                    <h3>Terms & Conditions</h3>
                  </div>

                  <strong>Subject to availability</strong>
                </div>

                <div className="quoteTermsBody">
                  <ol
                    className="quoteTermsTimeline"
                    aria-label="Terms and conditions"
                  >
                    {TERMS_AND_CONDITIONS.map((term) => (
                      <li key={term}>
                        <span className="quoteTermDot" aria-hidden="true" />
                        <p>{term}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>

              <footer
                className={`quoteFooter quotePremiumFooter ${uploadedSignature ? "hasSignature" : "noSignature"
                  }`}
              >
                <div className="quoteFooterNote">
                  <span>Thank you for choosing Adinn Roadshow.</span>
                  <strong>
                    This quotation is system generated and valid for{" "}
                    {COMPANY_DETAILS.validityDays} days.
                  </strong>
                </div>

                {uploadedSignature && (
                  <div className="quoteSignature">
                    <div className="quoteSignatureImageFrame">
                      <img
                        className="quoteSignatureImage"
                        src={uploadedSignature}
                        alt="Digital signature"
                      />
                    </div>
                    <span>
                      For {preparedByDetails.companyName || COMPANY_DETAILS.name}
                    </span>
                    <strong>Authorised Signatory</strong>
                  </div>
                )}
              </footer>

              <div className="quotePageNumber">Page 2 of 2</div>
            </section>
          </div>
        </aside>
      </main>
    </div>
  );
}
