// src/pages/RoadshowQO.tsx
/* eslint-disable */
// @ts-nocheck

import React, { useEffect, useMemo, useRef, useState } from "react";
import "./RoadshowQO.css";
import { Link } from "react-router-dom";
const LOGO_SRC = "/adinn-logo.png";

const VEHICLES_JSON_URL =
  "https://adinn-space.sgp1.cdn.digitaloceanspaces.com/roadshowRateCard/vehicles.json";

const USE_LOCAL_API = false; // set true for local, false for live
const API_BASE_URL = USE_LOCAL_API
  ? "http://localhost:3001"
  : "https://roadshow-backend.onrender.com";

const ROADSHOW_QUOTATION_API_URL = `${API_BASE_URL}/api/roadshow-quotations`;

const CATEGORY_ORDER = ["Flex Branding", "Hybrid LED + Flex", "LED Vehicles"];

const LED_TV_ADDON_RATE_PER_DAY = 350;
const POWER_BACKUP_ADDON_RATE_PER_DAY = 650;
const RTO_PERMISSION_VALIDITY_DAYS = 31;

const COMPANY_DETAILS = {
  name: "ADINN",
  title: "Roadshow Campaign Quotation",
  validityDays: 7,
};

const DEFAULT_PREPARED_BY_ADDRESS =
  "29,2A, 1st Cross Street, Bypass Rd, Vanamamalai Nagar, Kalavasal, Madurai, Tamil Nadu 625010";

const PREPARED_BY_DEFAULTS = {
  companyName: "Adinn Advertisment services Ltd",
  staffName: "",
  staffPhone: "",
  email: "",
  address: DEFAULT_PREPARED_BY_ADDRESS,
};

const TERMS_AND_CONDITIONS = [
  "PO Should be given in the name of \"ADINN ADVERTISING SERVICES LTD\".",
  "GST at 18% will be applicable on the above-mentioned rates.",
  "2 Working days time required for Branding & Reporting from the date of Design Confirmation.",
  "Working Hours - 8 Hours, Additional Hours Charges will be Applicable.",
  "Other charges Extra If any (such as Promoter, Leaflets, Power Backup, TV etc..).",
  "Audio should be played in Rural areas only, not able to play in cities.",
  "Video file should be given in MP4 format.",
];

type QuickSpec = {
  label: string;
  value: string;
};

type VehicleVariant = {
  id: number | string;
  label: string;
  kmPerDay: number;
  pricePerDay: number;
  leastSellingPricingPerDay?: number;
  quickSpecs?: QuickSpec[];
  included?: string[];
};

type LocationCharge = {
  label: string;
  [key: string]: string | number | undefined;
};

type Vehicle = {
  id: number | string;
  name: string;
  category: string;
  type: string;
  shortDescription: string;
  pricePerDay: number;
  leastSellingPricingPerDay?: number;
  highlight: string;
  quickSpecs: QuickSpec[];
  included: string[];
  brandingStatus: string;
  addOns: string[];
  images?: string[];
  image?: string;
  locationCharges?: LocationCharge[];
  packageTotal?: string;
  hide?: boolean | string;
  variants?: VehicleVariant[];
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

type RegionKey =
  | "chennai"
  | "rotn"
  | "kerala"
  | "andhara"
  | "telungana"
  | "karnataka"
  | "otherStates";

type QuoteLineItem = {
  label: string;
  description: string;
  rateLabel: string;
  periodLabel: string;
  quantityLabel: string;
  formulaLabel: string;
  amount: number;
  actualRate?: number;
  finalRate?: number;
  discountRate?: number;
  actualAmount?: number;
  discountAmount?: number;
};

type Html2CanvasFn = (
  element: HTMLElement,
  options?: Record<string, unknown>,
) => Promise<HTMLCanvasElement>;

type JsPdfInstance = {
  addImage: (...args: unknown[]) => void;
  addPage: (...args: unknown[]) => void;
  save: (fileName: string) => void;
  output: (type: "blob") => Blob;
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

    reader.onerror = () =>
      reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
};

const loadImageElement = (src: string) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Unable to load the selected image."));
    image.src = src;
  });
};

const canvasToPngDataUrl = (canvas: HTMLCanvasElement) => {
  return canvas.toDataURL("image/png");
};

const imageSourceToDataUrl = async (src: string) => {
  if (!src || src.startsWith("data:")) return src;

  const response = await fetch(src, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Unable to prepare logo for PDF.");
  }

  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(new Error("Unable to prepare logo for PDF."));

    reader.readAsDataURL(blob);
  });
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
    console.warn(
      "Image orientation normalization failed; using fallback.",
      error,
    );
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

const isVehicleHidden = (vehicle: Vehicle) => {
  if (vehicle.hide === true) return true;

  if (typeof vehicle.hide === "string") {
    return vehicle.hide.trim().toLowerCase() === "true";
  }

  return false;
};

const isValidVehicleRecord = (vehicle: Vehicle | undefined) => {
  return Boolean(
    vehicle &&
    vehicle.id !== undefined &&
    vehicle.id !== null &&
    typeof vehicle.name === "string" &&
    vehicle.name.trim() &&
    typeof vehicle.category === "string" &&
    vehicle.category.trim(),
  );
};

const getVisibleVehicles = (vehicleList: Vehicle[]) => {
  return vehicleList.filter(
    (vehicle) => isValidVehicleRecord(vehicle) && !isVehicleHidden(vehicle),
  );
};

const getVehicleVariants = (vehicle: Vehicle | undefined) => {
  if (!vehicle?.variants?.length) return [];

  return vehicle.variants.filter(
    (variant) =>
      variant &&
      variant.id !== undefined &&
      variant.id !== null &&
      Number.isFinite(Number(variant.pricePerDay)),
  );
};

const hasVehicleVariants = (vehicle: Vehicle | undefined) => {
  return getVehicleVariants(vehicle).length > 0;
};

const getDefaultVariantId = (vehicle: Vehicle | undefined) => {
  const firstVariant = getVehicleVariants(vehicle)[0];
  return firstVariant ? String(firstVariant.id) : "";
};

const getSelectedVariant = (
  vehicle: Vehicle | undefined,
  selectedVariantId: string,
) => {
  const variants = getVehicleVariants(vehicle);

  if (!variants.length) return undefined;

  return (
    variants.find((variant) => String(variant.id) === selectedVariantId) ||
    variants[0]
  );
};

const extractFirstNumber = (value?: string | number) => {
  if (typeof value === "number") return value;

  if (!value) return 0;

  const match = String(value).match(/\d+(?:\.\d+)?/);

  if (!match) return 0;

  const parsed = Number(match[0]);

  return Number.isFinite(parsed) ? parsed : 0;
};

const getVariantQuickSpecs = (
  vehicle: Vehicle | undefined,
  variant?: VehicleVariant,
) => {
  if (variant?.quickSpecs?.length) {
    return variant.quickSpecs;
  }

  return vehicle?.quickSpecs?.length ? vehicle.quickSpecs : [];
};

const findQuickSpec = (
  quickSpecs: QuickSpec[],
  matcher: (label: string, value: string) => boolean,
) => {
  return quickSpecs.find((spec) => {
    const label = String(spec.label || "")
      .trim()
      .toLowerCase();
    const value = String(spec.value || "")
      .trim()
      .toLowerCase();

    return matcher(label, value);
  });
};

const getPackageDetails = (
  vehicle: Vehicle | undefined,
  variant?: VehicleVariant,
) => {
  const quickSpecs = getVariantQuickSpecs(vehicle, variant);

  const kmSpec = findQuickSpec(
    quickSpecs,
    (label) =>
      label === "km" || (label.includes("km") && !label.includes("extra")),
  );
  const extraKmSpec = findQuickSpec(
    quickSpecs,
    (label) => label.includes("extra") && label.includes("km"),
  );
  const minimumSpec = findQuickSpec(
    quickSpecs,
    (label, value) => label.includes("minimum") || value.includes("minimum"),
  );
  const extraHourSpec = findQuickSpec(
    quickSpecs,
    (label) => label.includes("extra") && label.includes("hour"),
  );

  const kmLimit =
    variant?.kmPerDay ||
    extractFirstNumber(kmSpec?.value) ||
    extractFirstNumber(
      vehicle?.quickSpecs?.find((spec) =>
        String(spec.label || "")
          .toLowerCase()
          .includes("km"),
      )?.value,
    ) ||
    60;

  const minimumDays = extractFirstNumber(minimumSpec?.value) || 10;

  return {
    kmLimit,
    dailyKmLabel: `${kmLimit} km/day`,
    extraKm: extraKmSpec?.value || "",
    minimumDays,
    minimumDaysLabel: `${minimumDays} days`,
    extraHour: extraHourSpec?.value || "",
    quickSpecs,
  };
};

const getKmLimitFromQuickSpecs = (vehicle: Vehicle | undefined) => {
  return getPackageDetails(vehicle).kmLimit;
};

const getVehicleDisplayRate = (vehicle: Vehicle) => {
  const variants = getVehicleVariants(vehicle);

  if (!variants.length) return vehicle.pricePerDay || 0;

  return Math.min(...variants.map((variant) => variant.pricePerDay));
};

const getVehicleCardSubtitle = (vehicle: Vehicle) => {
  const variants = getVehicleVariants(vehicle);

  if (variants.length) {
    const kmLabels = variants.map((variant) => variant.label).join(", ");

    return `Packages from ${formatPrice(
      getVehicleDisplayRate(vehicle),
    )} /day · ${kmLabels}`;
  }

  const packageDetails = getPackageDetails(vehicle);

  return `${formatPrice(vehicle.pricePerDay || 0)} /day · ${
    packageDetails.kmLimit
  } km/day · Min ${packageDetails.minimumDays}d`;
};

const getVehicleRate = (
  vehicle: Vehicle | undefined,
  variant?: VehicleVariant,
) => {
  return variant?.pricePerDay || vehicle?.pricePerDay || 0;
};

const getVehicleLeastSellingRate = (
  vehicle: Vehicle | undefined,
  variant?: VehicleVariant,
) => {
  const baseRate = getVehicleRate(vehicle, variant);
  const rawLeastSellingRate =
    variant?.leastSellingPricingPerDay ??
    vehicle?.leastSellingPricingPerDay ??
    baseRate;

  const leastSellingRate = Number(rawLeastSellingRate);

  if (!Number.isFinite(leastSellingRate) || leastSellingRate <= 0) {
    return baseRate;
  }

  if (baseRate > 0 && leastSellingRate > baseRate) {
    return baseRate;
  }

  return leastSellingRate;
};

const getAllowedVehicleRateRange = (
  vehicle: Vehicle | undefined,
  variant?: VehicleVariant,
) => {
  const baseRate = getVehicleRate(vehicle, variant);
  const leastSellingRate = getVehicleLeastSellingRate(vehicle, variant);

  return {
    minRate: leastSellingRate,
    maxRate: baseRate,
  };
};

const buildVehicleDetailRows = (
  vehicle: Vehicle | undefined,
  packageDetails: ReturnType<typeof getPackageDetails>,
  vehicleRate: number,
) => {
  if (!vehicle) return [];

  return [
    {
      label: "Per Day Vehicle Rent",
      value: `${formatPrice(vehicleRate)} / per day`,
    },
    {
      label: "Daily KM Limit",
      value: `${packageDetails.kmLimit} km/day`,
    },
    {
      label: "Extra KM",
      value: packageDetails.extraKm || "-",
    },
    {
      label: "Extra Hour",
      value: packageDetails.extraHour || "-",
    },
  ];
};

const parseMoney = (value?: string | number) => {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const numericText = String(value).replace(/[^\d.-]/g, "");
  const parsed = Number(numericText);

  return Number.isFinite(parsed) ? parsed : 0;
};

const formatPrice = (amount: number) => {
  return `₹\u00A0${Math.round(amount).toLocaleString("en-IN")}`;
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

const sanitizeNumberText = (value: string) => {
  return String(value || "").replace(/\D/g, "");
};

const parseNumberText = (value: string, fallbackValue = 0) => {
  const digitsOnly = sanitizeNumberText(value);
  if (!digitsOnly) return fallbackValue;

  const parsed = Number(digitsOnly);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
};

const clampNumber = (value: string, minValue: number) => {
  const parsed = parseNumberText(value, minValue);
  if (!Number.isFinite(parsed)) return minValue;
  return Math.max(minValue, parsed);
};

const getRegionLabel = (region: RegionKey) => {
  const labels: Record<RegionKey, string> = {
    chennai: "Chennai",
    rotn: "ROTN",
    kerala: "Kerala",
    andhara: "Andhra",
    telungana: "Telangana",
    karnataka: "Karnataka",
    otherStates: "Other States",
  };

  return labels[region] || region;
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

const normalizeChargeKey = (value: string) =>
  value.replace(/[^a-z0-9]/gi, "").toLowerCase();

const getRegionChargeFallbackKeys = (region: RegionKey, chargeLabel = "") => {
  const normalizedLabel = chargeLabel.toLowerCase();

  const baseKeys: Record<RegionKey, string[]> = {
    chennai: ["chennai", "Chennai"],
    rotn: [
      "rotn",
      "ROTN",
      "rot",
      "restOfTamilNadu",
      "restoftamilnadu",
      "restOfTN",
    ],
    kerala: ["kerala", "Kerala"],
    andhara: [
      "andhara",
      "andhra",
      "Andhara",
      "Andhra",
      "andharaPradesh",
      "andhraPradesh",
      "ap",
      "AP",
    ],
    telungana: [
      "telungana",
      "telangana",
      "Telungana",
      "Telangana",
      "telengana",
      "ts",
      "TS",
    ],
    karnataka: ["karnataka", "Karnataka", "ka", "KA"],
    otherStates: [
      "otherStates",
      "otherstates",
      "otherState",
      "otherstate",
      "Other State",
      "other state",
      "others",
      "other",
    ],
  };

  const fallbackKeys = [...(baseKeys[region] || [])];

  if (normalizedLabel.includes("promoter")) {
    if (region === "chennai" || region === "rotn") {
      fallbackKeys.push(
        "Tamilnadu",
        "TamilNadu",
        "Tamil Nadu",
        "tamilnadu",
        "tamilNadu",
        "tn",
        "TN",
      );
    } else if (region === "kerala") {
      fallbackKeys.push("Kerala", "kerala");
    } else {
      fallbackKeys.push(
        "otherStates",
        "Other State",
        "other state",
        "otherstates",
        "others",
        "other",
      );
    }
  }

  if (normalizedLabel.includes("branding")) {
    if (region !== "kerala") {
      fallbackKeys.push(
        "general",
        "General",
        "Tamilnadu",
        "TamilNadu",
        "tamilnadu",
        "tamilNadu",
      );
    } else {
      fallbackKeys.push("general", "General");
    }
  }

  if (region === "otherStates") {
    fallbackKeys.push(
      "otherStates",
      "Other State",
      "other state",
      "otherstates",
      "others",
      "other",
    );
  }

  return Array.from(new Set(fallbackKeys));
};

const getLocationChargeValue = (row: LocationCharge, region: RegionKey) => {
  const fallbackKeys = getRegionChargeFallbackKeys(region, row.label);

  for (const key of fallbackKeys) {
    const exactValue = row[key];

    if (exactValue !== undefined && exactValue !== "") {
      return exactValue;
    }
  }

  const normalizedEntries = Object.entries(row).reduce<
    Record<string, string | number>
  >((entries, [key, value]) => {
    if (key !== "label" && value !== undefined && value !== "") {
      entries[normalizeChargeKey(key)] = value;
    }

    return entries;
  }, {});

  for (const key of fallbackKeys) {
    const normalizedValue = normalizedEntries[normalizeChargeKey(key)];

    if (normalizedValue !== undefined && normalizedValue !== "") {
      return normalizedValue;
    }
  }

  return "";
};

const findCharge = (
  vehicle: Vehicle | undefined,
  labelKeywords: string[],
  region: RegionKey,
) => {
  if (!vehicle?.locationCharges?.length) return 0;

  const row = vehicle.locationCharges.find((item) => {
    const label = String(item.label || "").toLowerCase();

    return labelKeywords.some((keyword) =>
      label.includes(keyword.toLowerCase()),
    );
  });

  if (!row) return 0;

  return parseMoney(getLocationChargeValue(row, region));
};

const getDefaultPricing = (
  vehicle: Vehicle | undefined,
  region: RegionKey,
  variant?: VehicleVariant,
): PricingDetails => {
  return {
    vehicleRate: variant?.pricePerDay || vehicle?.pricePerDay || 0,
    brandingCost: findCharge(vehicle, ["branding"], region),
    rtoPermission: findCharge(vehicle, ["rto", "permission"], region),
    promoterCost: findCharge(vehicle, ["promoter"], region),
    ledCost: LED_TV_ADDON_RATE_PER_DAY,
    led55Cost: 0,
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
    const existingScript = document.getElementById(
      id,
    ) as HTMLScriptElement | null;

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

const getQuotationPdfFileName = (
  proposalNumber: string,
  companyName: string,
) => {
  const companyPart = sanitizeFileNamePart(companyName || "quotation");
  const proposalPart = sanitizeFileNamePart(proposalNumber);

  return `${companyPart}-${proposalPart}.pdf`;
};

const getNextRoadshowQuotationNumber = async () => {
  const response = await fetch(`${ROADSHOW_QUOTATION_API_URL}/next-number`, {
    method: "GET",
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to get next quotation number.");
  }

  return result.data;
};

const createRoadshowQuotation = async (payload: Record<string, unknown>) => {
  const response = await fetch(ROADSHOW_QUOTATION_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to save quotation details.");
  }

  return result.data;
};

const uploadRoadshowQuotationPdf = async ({
  quotationId,
  pdfBlob,
  fileName,
}: {
  quotationId: string;
  pdfBlob: Blob;
  fileName: string;
}) => {
  const formData = new FormData();

  formData.append("pdf", pdfBlob, fileName);
  formData.append("fileName", fileName);

  const response = await fetch(
    `${ROADSHOW_QUOTATION_API_URL}/${quotationId}/pdf`,
    {
      method: "PUT",
      body: formData,
    },
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to upload quotation PDF.");
  }

  return result.data;
};

const triggerBlobDownload = (blob: Blob, fileName: string) => {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 1000);
};

export default function RoadshowQO() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [vehiclesError, setVehiclesError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedVehicleVariantId, setSelectedVehicleVariantId] =
    useState<string>("");
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
  const [quantityInput, setQuantityInput] = useState("1");
  const [promoterQuantity, setPromoterQuantity] = useState(1);
  const [promoterQuantityInput, setPromoterQuantityInput] = useState("1");
  const [days, setDays] = useState(10);
  const [daysInput, setDaysInput] = useState("10");
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

  const [leastSellingPriceInput, setLeastSellingPriceInput] = useState("");
  const [leastSellingPriceError, setLeastSellingPriceError] = useState("");
  const [quantityError, setQuantityError] = useState("");
  const [campaignDaysError, setCampaignDaysError] = useState("");
  const [addOnMessage, setAddOnMessage] = useState("");

  const [includePromoter, setIncludePromoter] = useState(false);
  const [includeLed, setIncludeLed] = useState(false);
  const [includePowerBackup, setIncludePowerBackup] = useState(false);

  const [uploadedLogo, setUploadedLogo] = useState("");
  const [pdfLogoSrc, setPdfLogoSrc] = useState("");
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
  const [nextQuotationMeta, setNextQuotationMeta] = useState<{
    quotationDate: string;
    quotationDateKey: string;
    nextSequence: number;
    nextQuotationNumber: string;
  } | null>(null);

  const [activeQuotationMeta, setActiveQuotationMeta] = useState<{
    quotationId: string;
    quotationNumber: string;
  } | null>(null);

  const [proposalDate, setProposalDate] = useState(() => new Date());

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);
  const signatureCropImageFrameRef = useRef<HTMLDivElement | null>(null);
  const signatureCropStartRef = useRef<Pick<CropSelection, "x" | "y"> | null>(
    null,
  );

  const displayLogo = uploadedLogo || LOGO_SRC;
  const renderLogoSrc = pdfLogoSrc || displayLogo;

  const fetchNextQuotationNumber = async () => {
    try {
      const nextQuotation = await getNextRoadshowQuotationNumber();
      setNextQuotationMeta(nextQuotation);
    } catch (error) {
      console.error(error);
      setPdfError(
        error instanceof Error
          ? error.message
          : "Unable to load next quotation number.",
      );
    }
  };

  useEffect(() => {
    fetchNextQuotationNumber();
  }, []);

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        setIsLoadingVehicles(true);
        setVehiclesError("");

        const response = await fetch(`${VEHICLES_JSON_URL}?v=${Date.now()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load vehicles from cloud.");
        }

        const cloudVehicles = await response.json();

        if (!isVehicleArray(cloudVehicles)) {
          throw new Error("Cloud vehicles.json is not a valid vehicle array.");
        }

        const visibleVehicles = getVisibleVehicles(cloudVehicles);

        setVehicles(visibleVehicles);

        const firstVehicle = visibleVehicles[0];

        if (firstVehicle) {
          setSelectedCategory(normalizeCategory(firstVehicle.category));
          setSelectedVehicleId(String(firstVehicle.id));
          setSelectedVehicleVariantId(getDefaultVariantId(firstVehicle));
        } else {
          setSelectedCategory("");
          setSelectedVehicleId("");
          setSelectedVehicleVariantId("");
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
      getVisibleVehicles(vehicles).map((vehicle) =>
        normalizeCategory(vehicle.category),
      ),
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
    return getVisibleVehicles(vehicles).filter(
      (vehicle) => normalizeCategory(vehicle.category) === selectedCategory,
    );
  }, [vehicles, selectedCategory]);

  const selectedVehicle = useMemo(() => {
    return getVisibleVehicles(vehicles).find(
      (vehicle) => String(vehicle.id) === selectedVehicleId,
    );
  }, [vehicles, selectedVehicleId]);

  const selectedVehicleVariants = useMemo(() => {
    return getVehicleVariants(selectedVehicle);
  }, [selectedVehicle]);

  const selectedVehicleVariant = useMemo(() => {
    return getSelectedVariant(selectedVehicle, selectedVehicleVariantId);
  }, [selectedVehicle, selectedVehicleVariantId]);

  const selectedPackageDetails = useMemo(() => {
    return getPackageDetails(selectedVehicle, selectedVehicleVariant);
  }, [selectedVehicle, selectedVehicleVariant]);

  const selectedVehicleRate = useMemo(() => {
    return getVehicleRate(selectedVehicle, selectedVehicleVariant);
  }, [selectedVehicle, selectedVehicleVariant]);

  const selectedVehicleRateRange = useMemo(() => {
    return getAllowedVehicleRateRange(selectedVehicle, selectedVehicleVariant);
  }, [selectedVehicle, selectedVehicleVariant]);

  const selectedVehicleLeastSellingRate = selectedVehicleRateRange.minRate;
  const selectedVehicleMaxRate = selectedVehicleRateRange.maxRate;

  const selectedVehicleDetailRows = useMemo(() => {
    return buildVehicleDetailRows(
      selectedVehicle,
      selectedPackageDetails,
      selectedVehicleRate,
    );
  }, [selectedVehicle, selectedPackageDetails, selectedVehicleRate]);

  const selectedVehicleDisplayName = selectedVehicleVariant
    ? `${selectedVehicle?.name || "Selected Vehicle"} - ${selectedVehicleVariant.label}`
    : selectedVehicle?.name || "Selected Vehicle";

  const draftProposalNumber = useMemo(() => {
    const dateKey = proposalDate.toISOString().slice(0, 10).replace(/-/g, "");
    const vehicleKey = selectedVehicleId || "NEW";
    const variantKey = selectedVehicleVariantId
      ? `-${selectedVehicleVariantId}`
      : "";
    return `ADINN-RS-${dateKey}-${vehicleKey}${variantKey}`;
  }, [proposalDate, selectedVehicleId, selectedVehicleVariantId]);

  const proposalNumber =
    activeQuotationMeta?.quotationNumber ||
    nextQuotationMeta?.nextQuotationNumber ||
    draftProposalNumber;

  const validUntilDate = useMemo(() => {
    return addDays(proposalDate, COMPANY_DETAILS.validityDays);
  }, [proposalDate]);

  useEffect(() => {
    if (!selectedVehicle) return;

    const nextVariantId = selectedVehicleVariant
      ? String(selectedVehicleVariant.id)
      : "";

    setSelectedVehicleVariantId((currentVariantId) =>
      currentVariantId === nextVariantId ? currentVariantId : nextVariantId,
    );

    const nextPricing = getDefaultPricing(
      selectedVehicle,
      region,
      selectedVehicleVariant,
    );

    const nextPackageDetails = getPackageDetails(
      selectedVehicle,
      selectedVehicleVariant,
    );
    const nextMinimumDays = nextPackageDetails.minimumDays || 10;

    setPricingDetails(nextPricing);
    setLeastSellingPriceInput(String(nextPricing.vehicleRate || ""));
    setLeastSellingPriceError("");
    setCampaignDaysError("");
    setKmLimit(nextPackageDetails.kmLimit);
    setMinimumDays(nextMinimumDays);
    setDays((currentDays) => {
      const nextDays = Math.max(currentDays, nextMinimumDays);
      setDaysInput(String(nextDays));
      return nextDays;
    });
    setActiveQuotationMeta(null);
  }, [selectedVehicle, selectedVehicleVariant, region]);

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

  const buildQuoteLineItemsForValues = ({
    pricingValue = pricingDetails,
    quantityValue = quantity,
    daysValue = days,
    promoterQuantityValue = promoterQuantity,
    rtoBillingMonthsValue = getRtoBillingMonths(daysValue),
  }: {
    pricingValue?: PricingDetails;
    quantityValue?: number;
    daysValue?: number;
    promoterQuantityValue?: number;
    rtoBillingMonthsValue?: number;
  } = {}) => {
    const effectivePowerBackupRate =
      pricingValue.powerBackup > 0
        ? pricingValue.powerBackup
        : POWER_BACKUP_ADDON_RATE_PER_DAY;

    const actualVehicleRate =
      selectedVehicleRate > 0 ? selectedVehicleRate : pricingValue.vehicleRate;
    const finalVehicleRate = pricingValue.vehicleRate;
    const vehicleDiscountRate = Math.max(
      actualVehicleRate - finalVehicleRate,
      0,
    );
    const actualVehicleAmount = actualVehicleRate * quantityValue * daysValue;
    const finalVehicleAmount = finalVehicleRate * quantityValue * daysValue;
    const vehicleDiscountAmount =
      vehicleDiscountRate * quantityValue * daysValue;

    const items: QuoteLineItem[] = [
      {
        label: "Vehicle Rental",
        description: selectedVehicleDisplayName,
        rateLabel: `${formatPrice(finalVehicleRate)} / day`,
        periodLabel: `${daysValue} day(s)`,
        quantityLabel: `${quantityValue}`,
        formulaLabel: `${formatPrice(finalVehicleRate)} × ${daysValue} day(s) × ${quantityValue} vehicle(s)`,
        amount: finalVehicleAmount,
        actualRate: actualVehicleRate,
        finalRate: finalVehicleRate,
        discountRate: vehicleDiscountRate,
        actualAmount: actualVehicleAmount,
        discountAmount: vehicleDiscountAmount,
      },
      {
        label: "Branding Cost",
        description: `${getRegionLabel(region)} vehicle branding production and application support`,
        rateLabel: `${formatPrice(pricingValue.brandingCost)} / vehicle`,
        periodLabel: "One-time",
        quantityLabel: `${quantityValue}`,
        formulaLabel: `${formatPrice(pricingValue.brandingCost)} × ${quantityValue} vehicle(s)`,
        amount: pricingValue.brandingCost * quantityValue,
      },
      {
        label: "RTO Permission",
        description: `Monthly ${getRegionLabel(region)} Permission Charges.`,
        rateLabel: `${formatPrice(pricingValue.rtoPermission)} / vehicle`,
        periodLabel: `${rtoBillingMonthsValue} billing month(s)`,
        quantityLabel: `${quantityValue}`,
        formulaLabel: `${formatPrice(pricingValue.rtoPermission)} × ${rtoBillingMonthsValue} month(s) × ${quantityValue} vehicle(s)`,
        amount:
          pricingValue.rtoPermission * rtoBillingMonthsValue * quantityValue,
      },
    ];

    if (pricingValue.upDownCharge > 0) {
      items.push({
        label: "Up & Down Charge",
        description: "Campaign vehicle movement support",
        rateLabel: `${formatPrice(pricingValue.upDownCharge)} / vehicle`,
        periodLabel: "One-time",
        quantityLabel: `${quantityValue} vehicle(s)`,
        formulaLabel: `${formatPrice(pricingValue.upDownCharge)} × ${quantityValue} vehicle(s)`,
        amount: pricingValue.upDownCharge * quantityValue,
      });
    }

    if (includePromoter) {
      items.push({
        label: "Promoter Support",
        description: "On-ground campaign promoter support",
        rateLabel: `${formatPrice(pricingValue.promoterCost)} / day`,
        periodLabel: `${daysValue} day(s)`,
        quantityLabel: `${promoterQuantityValue}`,
        formulaLabel: `${formatPrice(pricingValue.promoterCost)} × ${daysValue} day(s) × ${promoterQuantityValue} promoter(s)`,
        amount: pricingValue.promoterCost * promoterQuantityValue * daysValue,
      });
    }

    if (includeLed) {
      items.push({
        label: '43" LED TV',
        description: '43" LED TV add-on for campaign display',
        rateLabel: `${formatPrice(pricingValue.ledCost)} / day`,
        periodLabel: `${daysValue} day(s)`,
        quantityLabel: `${quantityValue}`,
        formulaLabel: `${formatPrice(pricingValue.ledCost)} × ${daysValue} day(s) × ${quantityValue} unit(s)`,
        amount: pricingValue.ledCost * quantityValue * daysValue,
      });
    }

    if (includePowerBackup) {
      items.push({
        label: "Power Backup",
        description: "Power backup add-on for campaign support",
        rateLabel: `${formatPrice(effectivePowerBackupRate)} / day`,
        periodLabel: `${daysValue} day(s)`,
        quantityLabel: `${quantityValue}`,
        formulaLabel: `${formatPrice(effectivePowerBackupRate)} × ${daysValue} day(s) × ${quantityValue} unit(s)`,
        amount: effectivePowerBackupRate * quantityValue * daysValue,
      });
    }

    return items.filter((item) => item.amount > 0);
  };

  const quoteLineItems = useMemo<QuoteLineItem[]>(() => {
    return buildQuoteLineItemsForValues({
      pricingValue: pricingDetails,
      quantityValue: quantity,
      daysValue: days,
      promoterQuantityValue: promoterQuantity,
      rtoBillingMonthsValue: rtoBillingMonths,
    });
  }, [
    selectedVehicle,
    selectedVehicleVariant,
    selectedVehicleDisplayName,
    pricingDetails,
    quantity,
    promoterQuantity,
    days,
    region,
    includePromoter,
    includeLed,
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

  const totalDiscountAmount = useMemo(() => {
    return quoteLineItems.reduce(
      (total, item) => total + (item.discountAmount || 0),
      0,
    );
  }, [quoteLineItems]);

  const actualSubtotal = subtotal + totalDiscountAmount;

  const vehicleActualRate =
    selectedVehicleRate > 0 ? selectedVehicleRate : pricingDetails.vehicleRate;
  const vehicleFinalRate = pricingDetails.vehicleRate;
  const vehicleDiscountPerDay = Math.max(
    vehicleActualRate - vehicleFinalRate,
    0,
  );
  const vehicleActualAmount = vehicleActualRate * quantity * days;
  const vehicleDiscountAmount = vehicleDiscountPerDay * quantity * days;
  const vehicleRemainingAmount = vehicleFinalRate * quantity * days;

  const selectedAddOns = useMemo(() => {
    const addOns: string[] = [];

    if (includePromoter) {
      addOns.push(`${promoterQuantity} promoter(s)`);
    }

    if (includeLed) {
      addOns.push('43" LED TV');
    }

    if (includePowerBackup) {
      addOns.push("Power backup");
    }

    return addOns.length ? addOns : ["No optional add-ons selected"];
  }, [includePromoter, includeLed, includePowerBackup, promoterQuantity]);

  const isCompactProposal = quoteLineItems.length >= 6;

  const clearSavedQuotation = () => {
    setActiveQuotationMeta(null);
  };

  const handleCategorySelect = (category: string) => {
    clearSavedQuotation();
    setSelectedCategory(category);

    const firstVehicle = getVisibleVehicles(vehicles).find(
      (vehicle) => normalizeCategory(vehicle.category) === category,
    );

    if (firstVehicle) {
      setSelectedVehicleId(String(firstVehicle.id));
      setSelectedVehicleVariantId(getDefaultVariantId(firstVehicle));
    } else {
      setSelectedVehicleId("");
      setSelectedVehicleVariantId("");
    }
  };

  const handleVehicleSelect = (vehicle: Vehicle) => {
    clearSavedQuotation();
    setSelectedVehicleId(String(vehicle.id));
    setSelectedVehicleVariantId(getDefaultVariantId(vehicle));
  };

  const handleVariantSelect = (variant: VehicleVariant) => {
    clearSavedQuotation();
    setSelectedVehicleVariantId(String(variant.id));
  };

  const handleClientChange = (field: keyof ClientDetails, value: string) => {
    clearSavedQuotation();

    setClientDetails((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handlePreparedByChange = (
    field: keyof PreparedByDetails,
    value: string,
  ) => {
    clearSavedQuotation();

    setPreparedByDetails((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handlePricingChange = (field: keyof PricingDetails, value: string) => {
    clearSavedQuotation();

    const safeValue = parseNumberText(value, 0);

    setPricingDetails((current) => ({
      ...current,
      [field]: safeValue,
    }));
  };

  const handleLeastSellingPriceChange = (value: string) => {
    clearSavedQuotation();
    const digitsOnly = sanitizeNumberText(value);
    setLeastSellingPriceInput(digitsOnly);

    if (!selectedVehicle) {
      setLeastSellingPriceError("");
      return;
    }

    if (!digitsOnly.trim()) {
      setLeastSellingPriceError(
        `Allowed vehicle rate is ${formatPrice(
          selectedVehicleLeastSellingRate,
        )} to ${formatPrice(selectedVehicleMaxRate)} only.`,
      );
      return;
    }

    const numericValue = Number(digitsOnly);

    if (!Number.isFinite(numericValue)) {
      setLeastSellingPriceError(
        `Allowed vehicle rate is ${formatPrice(
          selectedVehicleLeastSellingRate,
        )} to ${formatPrice(selectedVehicleMaxRate)} only.`,
      );
      return;
    }

    if (
      numericValue < selectedVehicleLeastSellingRate ||
      numericValue > selectedVehicleMaxRate
    ) {
      setLeastSellingPriceError(
        `Allowed vehicle rate is ${formatPrice(
          selectedVehicleLeastSellingRate,
        )} to ${formatPrice(selectedVehicleMaxRate)} only.`,
      );
      return;
    }

    setLeastSellingPriceError("");
    setPricingDetails((current) => ({
      ...current,
      vehicleRate: numericValue,
    }));
  };

  const handleLeastSellingPriceBlur = () => {
    if (leastSellingPriceError) {
      setLeastSellingPriceInput(String(pricingDetails.vehicleRate || ""));
      setLeastSellingPriceError("");
    }
  };

  const handleQuantityChange = (value: string) => {
    clearSavedQuotation();

    const digitsOnly = sanitizeNumberText(value);
    setQuantityInput(digitsOnly);

    if (!digitsOnly) {
      setQuantityError("");
      return;
    }

    const nextQuantity = Number(digitsOnly);

    if (!Number.isFinite(nextQuantity)) {
      setQuantityError("Please enter a valid number of vehicles.");
      return;
    }

    if (nextQuantity < 1) {
      setQuantityError("Minimum 1 vehicle is required.");
      return;
    }

    setQuantity(nextQuantity);
    setQuantityError("");
  };

  const handleQuantityBlur = () => {
    if (!quantityInput) {
      setQuantityInput(String(quantity));
      setQuantityError("");
      return;
    }

    const nextQuantity = Number(quantityInput);

    if (!Number.isFinite(nextQuantity) || nextQuantity < 1) {
      setQuantity(1);
      setQuantityInput("1");
      setQuantityError("");
    }
  };

  const handleDaysChange = (value: string) => {
    clearSavedQuotation();

    const digitsOnly = sanitizeNumberText(value);
    setDaysInput(digitsOnly);

    if (!digitsOnly) {
      setCampaignDaysError("");
      return;
    }

    const nextDays = Number(digitsOnly);

    if (!Number.isFinite(nextDays)) {
      setCampaignDaysError("Please enter a valid number of days.");
      return;
    }

    if (nextDays < minimumDays) {
      setCampaignDaysError(
        `Minimum booking for the selected vehicle is ${minimumDays} days. Please enter ${minimumDays} or above.`,
      );
      return;
    }

    setDays(nextDays);
    setCampaignDaysError("");
  };

  const handleDaysBlur = () => {
    if (!daysInput) {
      setDaysInput(String(days));
      setCampaignDaysError("");
      return;
    }

    const nextDays = Number(daysInput);

    if (!Number.isFinite(nextDays) || nextDays < minimumDays) {
      const safeDays = Math.max(days, minimumDays);
      setDays(safeDays);
      setDaysInput(String(safeDays));
      setCampaignDaysError("");
    }
  };

  const handlePromoterQuantityChange = (value: string) => {
    clearSavedQuotation();

    const digitsOnly = sanitizeNumberText(value);
    setPromoterQuantityInput(digitsOnly);

    if (!digitsOnly) {
      setPromoterQuantity(1);
      return;
    }

    const nextPromoterQuantity = Number(digitsOnly);

    if (!Number.isFinite(nextPromoterQuantity) || nextPromoterQuantity < 1) {
      return;
    }

    setPromoterQuantity(nextPromoterQuantity);
  };

  const handlePromoterQuantityBlur = () => {
    if (!includePromoter) {
      return;
    }

    const nextPromoterQuantity = Number(
      sanitizeNumberText(promoterQuantityInput),
    );

    if (
      !promoterQuantityInput ||
      !Number.isFinite(nextPromoterQuantity) ||
      nextPromoterQuantity < 1
    ) {
      setPromoterQuantity(1);
      setPromoterQuantityInput("1");
      return;
    }

    setPromoterQuantity(nextPromoterQuantity);
    setPromoterQuantityInput(String(nextPromoterQuantity));
  };

  const handlePromoterToggle = (checked: boolean) => {
    clearSavedQuotation();
    setIncludePromoter(checked);

    if (checked) {
      const currentPromoterQuantity = Number(
        sanitizeNumberText(promoterQuantityInput),
      );

      if (
        !promoterQuantityInput ||
        !Number.isFinite(currentPromoterQuantity) ||
        currentPromoterQuantity < 1
      ) {
        setPromoterQuantity(1);
        setPromoterQuantityInput("1");
      }
    }
  };

  const handleGstPercentChange = (value: string) => {
    clearSavedQuotation();
    setGstPercent(clampNumber(value, 0));
  };

  const handleResetPricing = () => {
    clearSavedQuotation();
    const defaultPricing = getDefaultPricing(
      selectedVehicle,
      region,
      selectedVehicleVariant,
    );
    setPricingDetails(defaultPricing);
    setLeastSellingPriceInput(String(defaultPricing.vehicleRate || ""));
    setLeastSellingPriceError("");
    setCampaignDaysError("");
    setAddOnMessage("");
    setIncludePromoter(false);
    setIncludeLed(false);
    setIncludePowerBackup(false);
    setPromoterQuantity(1);
    setPromoterQuantityInput("1");
  };

  const handleLedToggle = (checked: boolean) => {
    clearSavedQuotation();
    setIncludeLed(checked);

    if (checked) {
      setIncludePowerBackup(true);
      setAddOnMessage(
        'Power Backup is mandatory with 43" LED TV and has been added automatically.',
      );
      setPricingDetails((current) => ({
        ...current,
        ledCost: LED_TV_ADDON_RATE_PER_DAY,
        powerBackup:
          current.powerBackup > 0
            ? current.powerBackup
            : POWER_BACKUP_ADDON_RATE_PER_DAY,
      }));
      return;
    }

    setAddOnMessage(
      includePowerBackup
        ? '43" LED TV removed. Power Backup is still selected; you can remove it if not needed.'
        : "",
    );
  };

  const handlePowerBackupToggle = (checked: boolean) => {
    clearSavedQuotation();

    if (includeLed && !checked) {
      setIncludePowerBackup(true);
      setAddOnMessage(
        'Power Backup cannot be removed while 43" LED TV is selected.',
      );
      return;
    }

    setIncludePowerBackup(checked);
    setAddOnMessage("");

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
    clearSavedQuotation();

    const file = event.target.files?.[0];

    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setUploadedLogo(imageUrl);
  };

  const getSignatureCropPoint = (event: React.PointerEvent<HTMLDivElement>) => {
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

    clearSavedQuotation();

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
    setSignatureCrop(
      normalizeCropFromPoints(signatureCropStartRef.current, point),
    );
  };

  const handleSignatureCropPointerUp = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!signatureCropStartRef.current) return;

    const point = getSignatureCropPoint(event);
    const nextCrop = normalizeCropFromPoints(
      signatureCropStartRef.current,
      point,
    );

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
    clearSavedQuotation();

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

    clearSavedQuotation();

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
    clearSavedQuotation();
    setSignatureSource("");
    setUploadedSignature("");
    setSignatureCrop(DEFAULT_SIGNATURE_CROP);
    setSignatureCropMessage("");

    if (signatureInputRef.current) {
      signatureInputRef.current.value = "";
    }
  };

  const buildRoadshowQuotationPayload = (
    overrides: {
      quantity?: number;
      promoterQuantity?: number;
      days?: number;
      gstPercent?: number;
      pricingDetails?: PricingDetails;
      quoteLineItems?: QuoteLineItem[];
      subtotal?: number;
      gstAmount?: number;
      grandTotal?: number;
      rtoBillingMonths?: number;
    } = {},
  ) => {
    const effectiveQuantity = overrides.quantity ?? quantity;
    const effectivePromoterQuantity =
      overrides.promoterQuantity ?? promoterQuantity;
    const effectiveDays = overrides.days ?? days;
    const effectiveGstPercent = overrides.gstPercent ?? gstPercent;
    const effectivePricingDetails = overrides.pricingDetails ?? pricingDetails;
    const effectiveRtoBillingMonths =
      overrides.rtoBillingMonths ?? getRtoBillingMonths(effectiveDays);
    const effectiveQuoteLineItems =
      overrides.quoteLineItems ??
      buildQuoteLineItemsForValues({
        pricingValue: effectivePricingDetails,
        quantityValue: effectiveQuantity,
        daysValue: effectiveDays,
        promoterQuantityValue: effectivePromoterQuantity,
        rtoBillingMonthsValue: effectiveRtoBillingMonths,
      });
    const effectiveSubtotal =
      overrides.subtotal ??
      effectiveQuoteLineItems.reduce((total, item) => total + item.amount, 0);
    const effectiveGstAmount =
      overrides.gstAmount ?? effectiveSubtotal * (effectiveGstPercent / 100);
    const effectiveGrandTotal =
      overrides.grandTotal ?? effectiveSubtotal + effectiveGstAmount;
    const effectiveTotalDiscountAmount = effectiveQuoteLineItems.reduce(
      (total, item) => total + (item.discountAmount || 0),
      0,
    );
    const effectiveActualSubtotal =
      effectiveSubtotal + effectiveTotalDiscountAmount;

    const effectiveSelectedAddOns: string[] = [];

    if (includePromoter) {
      effectiveSelectedAddOns.push(`${effectivePromoterQuantity} promoter(s)`);
    }

    if (includeLed) {
      effectiveSelectedAddOns.push('43" LED TV');
    }

    if (includePowerBackup) {
      effectiveSelectedAddOns.push("Power backup");
    }

    const selectedAddOnsForPayload = effectiveSelectedAddOns.length
      ? effectiveSelectedAddOns
      : ["No optional add-ons selected"];

    return {
      payloadVersion: "roadshow-quotation-v1",
      source: "roadshow_quotation_generator",
      quotationType: "roadshow_campaign",

      company: {
        name: COMPANY_DETAILS.name,
        title: COMPANY_DETAILS.title,
        validityDays: COMPANY_DETAILS.validityDays,
        defaultLogoSrc: LOGO_SRC,
        displayLogoSrc: displayLogo,
      },

      quotation: {
        draftProposalNumber,
        displayedProposalNumber: proposalNumber,
        proposalDate: proposalDate.toISOString(),
        proposalDateDisplay: formatDate(proposalDate),
        validUntilDate: validUntilDate.toISOString(),
        validUntilDateDisplay: formatDate(validUntilDate),
        validityDays: COMPANY_DETAILS.validityDays,
      },

      clientDetails: {
        ...clientDetails,
      },

      preparedByDetails: {
        ...preparedByDetails,
        staff: {
          name: preparedByDetails.staffName,
          phoneNumber: preparedByDetails.staffPhone,
        },
      },

      campaign: {
        campaignName: clientDetails.campaignName,
        campaignLocation: clientDetails.campaignLocation,
        region,
        regionLabel: getRegionLabel(region),
        selectedCategory,
        selectedVehicleId,
        selectedVehicleVariantId,
        selectedVehicleVariantLabel: selectedVehicleVariant?.label || "",
        selectedVehicleVariantKmPerDay: selectedPackageDetails.kmLimit || null,
        selectedVehicleVariantDailyKmLabel:
          selectedPackageDetails.dailyKmLabel || "",
        selectedVehicleVariantPricePerDay:
          effectivePricingDetails.vehicleRate || null,
        selectedVehicleVariantMasterPricePerDay: selectedVehicleRate || null,
        selectedVehicleVariantLeastSellingPricingPerDay:
          selectedVehicleVariant?.leastSellingPricingPerDay ||
          selectedVehicle?.leastSellingPricingPerDay ||
          null,
        selectedVehicleVariantExtraKm: selectedPackageDetails.extraKm || "",
        selectedVehicleVariantExtraHour: selectedPackageDetails.extraHour || "",
        selectedVehicleVariantMinimumDays:
          selectedPackageDetails.minimumDays || null,
        quantity: effectiveQuantity,
        promoterQuantity: effectivePromoterQuantity,
        days: effectiveDays,
        kmLimit,
        minimumDays,
        gstPercent: effectiveGstPercent,
        rtoPermissionValidityDays: RTO_PERMISSION_VALIDITY_DAYS,
        rtoBillingMonths: effectiveRtoBillingMonths,
      },

      vehicle: {
        selectedCategory,
        selectedVehicleId,
        selectedVehicleVariantId,
        selectedVehicleVariantSnapshot: selectedVehicleVariant || null,
        selectedVehicleSnapshot: selectedVehicle
          ? {
              ...selectedVehicle,
              normalizedCategory: normalizeCategory(selectedVehicle.category),
            }
          : null,
      },

      pricing: {
        currency: "INR",
        pricingDetails: {
          ...effectivePricingDetails,
        },
        quoteLineItems: effectiveQuoteLineItems.map((item, index) => ({
          serialNumber: index + 1,
          ...item,
        })),
        actualSubtotal: effectiveActualSubtotal,
        totalDiscountAmount: effectiveTotalDiscountAmount,
        subtotal: effectiveSubtotal,
        gstPercent: effectiveGstPercent,
        gstAmount: effectiveGstAmount,
        grandTotal: effectiveGrandTotal,
        advancePercent: 50,
        advanceAmount: effectiveGrandTotal * 0.5,
      },

      addOns: {
        includePromoter,
        includeLed,
        includePowerBackup,
        selectedAddOns: selectedAddOnsForPayload,
      },

      assets: {
        logo: {
          isCustomLogoUploaded: Boolean(uploadedLogo),
          defaultLogoSrc: LOGO_SRC,
          displayLogoSrc: uploadedLogo
            ? "custom-logo-used-in-generated-pdf"
            : LOGO_SRC,
        },
        signature: {
          hasSignature: Boolean(uploadedSignature),
          signatureCrop,
          signatureDataUrl: "",
        },
      },

      termsAndConditions: TERMS_AND_CONDITIONS,
    };
  };

  const resetQuotationForm = async () => {
    const firstVehicle = getVisibleVehicles(vehicles)[0];
    const defaultRegion: RegionKey = "chennai";
    const nextProposalDate = new Date();

    setProposalDate(nextProposalDate);

    setClientDetails({
      clientName: "",
      companyName: "",
      contactNumber: "",
      email: "",
      campaignName: "",
      campaignLocation: "",
    });

    setPreparedByDetails({ ...PREPARED_BY_DEFAULTS });

    setQuantity(1);
    setQuantityInput("1");
    setQuantityError("");
    setPromoterQuantity(1);
    setPromoterQuantityInput("1");
    setDays(10);
    setDaysInput("10");
    setKmLimit(60);
    setMinimumDays(10);
    setGstPercent(18);
    setCampaignDaysError("");
    setAddOnMessage("");

    setIncludePromoter(false);
    setIncludeLed(false);
    setIncludePowerBackup(false);

    setUploadedLogo("");
    setSignatureSource("");
    setUploadedSignature("");
    setSignatureCrop(DEFAULT_SIGNATURE_CROP);
    setSignatureCropMessage("");
    setIsSelectingSignatureCrop(false);

    setActiveQuotationMeta(null);

    if (firstVehicle) {
      const defaultVariant = getSelectedVariant(
        firstVehicle,
        getDefaultVariantId(firstVehicle),
      );

      setSelectedCategory(normalizeCategory(firstVehicle.category));
      setSelectedVehicleId(String(firstVehicle.id));
      setSelectedVehicleVariantId(
        defaultVariant ? String(defaultVariant.id) : "",
      );
      const defaultPackageDetails = getPackageDetails(
        firstVehicle,
        defaultVariant,
      );

      const defaultMinimumDays = defaultPackageDetails.minimumDays || 10;
      setRegion(defaultRegion);
      setKmLimit(defaultPackageDetails.kmLimit);
      setMinimumDays(defaultMinimumDays);
      setDays(defaultMinimumDays);
      setDaysInput(String(defaultMinimumDays));
      const defaultPricing = getDefaultPricing(
        firstVehicle,
        defaultRegion,
        defaultVariant,
      );

      setPricingDetails(defaultPricing);
      setLeastSellingPriceInput(String(defaultPricing.vehicleRate || ""));
      setLeastSellingPriceError("");
      setCampaignDaysError("");
      setAddOnMessage("");
    } else {
      setSelectedCategory("");
      setSelectedVehicleId("");
      setSelectedVehicleVariantId("");
      setRegion(defaultRegion);
      setPricingDetails({
        vehicleRate: 0,
        brandingCost: 0,
        rtoPermission: 0,
        promoterCost: 0,
        ledCost: 0,
        led55Cost: 0,
        powerBackup: 0,
        upDownCharge: 0,
      });
      setLeastSellingPriceInput("");
      setLeastSellingPriceError("");
      setCampaignDaysError("");
      setAddOnMessage("");
    }

    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }

    if (signatureInputRef.current) {
      signatureInputRef.current.value = "";
    }

    await fetchNextQuotationNumber();
  };

  const prepareAndPrintProposal = async () => {
    setIsPdfMode(true);
    setPdfError("");

    await waitForNextPaint();
    await waitForImagesToLoad(".printableArea img");

    window.print();
  };

  const normalizeMinimumFieldsForDownload = () => {
    const parsedQuantity = Number(sanitizeNumberText(quantityInput));
    const normalizedQuantity =
      Number.isFinite(parsedQuantity) && parsedQuantity >= 1
        ? parsedQuantity
        : 1;

    const parsedDays = Number(sanitizeNumberText(daysInput));
    const normalizedDays =
      Number.isFinite(parsedDays) && parsedDays >= minimumDays
        ? parsedDays
        : minimumDays;

    const parsedPromoterQuantity = Number(
      sanitizeNumberText(promoterQuantityInput),
    );
    const normalizedPromoterQuantity =
      includePromoter &&
      Number.isFinite(parsedPromoterQuantity) &&
      parsedPromoterQuantity >= 1
        ? parsedPromoterQuantity
        : 1;

    const normalizedGstPercent =
      Number.isFinite(Number(gstPercent)) && Number(gstPercent) >= 0
        ? Number(gstPercent)
        : 0;

    const lspDigitsOnly = sanitizeNumberText(leastSellingPriceInput);
    const parsedLeastSellingPrice = Number(lspDigitsOnly);
    let normalizedVehicleRate = pricingDetails.vehicleRate;

    if (selectedVehicle) {
      if (
        !lspDigitsOnly ||
        !Number.isFinite(parsedLeastSellingPrice) ||
        parsedLeastSellingPrice < selectedVehicleLeastSellingRate
      ) {
        normalizedVehicleRate = selectedVehicleLeastSellingRate;
      } else if (parsedLeastSellingPrice > selectedVehicleMaxRate) {
        normalizedVehicleRate = selectedVehicleMaxRate;
      } else {
        normalizedVehicleRate = parsedLeastSellingPrice;
      }
    }

    const normalizedPricingDetails = {
      ...pricingDetails,
      vehicleRate: normalizedVehicleRate,
      powerBackup:
        pricingDetails.powerBackup > 0
          ? pricingDetails.powerBackup
          : POWER_BACKUP_ADDON_RATE_PER_DAY,
    };

    const normalizedRtoBillingMonths = getRtoBillingMonths(normalizedDays);
    const normalizedQuoteLineItems = buildQuoteLineItemsForValues({
      pricingValue: normalizedPricingDetails,
      quantityValue: normalizedQuantity,
      daysValue: normalizedDays,
      promoterQuantityValue: normalizedPromoterQuantity,
      rtoBillingMonthsValue: normalizedRtoBillingMonths,
    });
    const normalizedSubtotal = normalizedQuoteLineItems.reduce(
      (total, item) => total + item.amount,
      0,
    );
    const normalizedGstAmount =
      normalizedSubtotal * (normalizedGstPercent / 100);
    const normalizedGrandTotal = normalizedSubtotal + normalizedGstAmount;

    setQuantity(normalizedQuantity);
    setQuantityInput(String(normalizedQuantity));
    setQuantityError("");

    setDays(normalizedDays);
    setDaysInput(String(normalizedDays));
    setCampaignDaysError("");

    setPromoterQuantity(normalizedPromoterQuantity);
    setPromoterQuantityInput(String(normalizedPromoterQuantity));
    setGstPercent(normalizedGstPercent);
    setPricingDetails(normalizedPricingDetails);
    setLeastSellingPriceInput(String(normalizedVehicleRate || ""));
    setLeastSellingPriceError("");

    return {
      quantity: normalizedQuantity,
      promoterQuantity: normalizedPromoterQuantity,
      days: normalizedDays,
      gstPercent: normalizedGstPercent,
      pricingDetails: normalizedPricingDetails,
      quoteLineItems: normalizedQuoteLineItems,
      subtotal: normalizedSubtotal,
      gstAmount: normalizedGstAmount,
      grandTotal: normalizedGrandTotal,
      rtoBillingMonths: normalizedRtoBillingMonths,
    };
  };

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;

    const normalizedQuoteValues = normalizeMinimumFieldsForDownload();

    if (!clientDetails.companyName.trim()) {
      setPdfError("Client company name is required before downloading PDF.");
      return;
    }

    if (
      !preparedByDetails.staffName.trim() ||
      !preparedByDetails.staffPhone.trim()
    ) {
      setPdfError(
        "Prepared by staff name and phone number are required before downloading PDF.",
      );
      return;
    }

    try {
      setPdfError("");
      setIsGeneratingPdf(true);

      const savedQuotation = await createRoadshowQuotation(
        buildRoadshowQuotationPayload(normalizedQuoteValues),
      );

      setActiveQuotationMeta({
        quotationId: savedQuotation.quotationId,
        quotationNumber: savedQuotation.quotationNumber,
      });

      const stableLogoDataUrl = await imageSourceToDataUrl(displayLogo);
      setPdfLogoSrc(stableLogoDataUrl);

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

      const pageElements = Array.from(
        document.querySelectorAll<HTMLElement>(".printableArea .pdfPage"),
      );

      if (!pageElements.length) {
        throw new Error("Unable to find the quotation pages for PDF download.");
      }

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

      const fileName = getQuotationPdfFileName(
        savedQuotation.quotationNumber,
        clientDetails.companyName,
      );

      const pdfBlob = pdf.output("blob");

      await uploadRoadshowQuotationPdf({
        quotationId: savedQuotation.quotationId,
        pdfBlob,
        fileName,
      });

      triggerBlobDownload(pdfBlob, fileName);

      await resetQuotationForm();
    } catch (error) {
      console.error(error);

      setPdfError(
        error instanceof Error
          ? `PDF download failed: ${error.message}`
          : "PDF download failed. Please try again.",
      );
    } finally {
      document.body.classList.remove("pdfExporting");
      setPdfLogoSrc("");
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

  return (
    <div className={`qoPage ${isPdfMode ? "pdfMode" : ""}`}>
      <header className="qoHeader noPrint">
        <div className="qoHeaderInner">
          <div className="qoBrand">
            <div className="qoBrandLogo">
              <img src={LOGO_SRC} alt="Adinn" />
            </div>

            <div>
              <h1>Roadshow Quotation Studio</h1>
              <p>ADINN · Premium Outdoor Campaign Proposals</p>
            </div>
          </div>

          <div className="qoHeaderActions">
            <Link to="/roadshow-quotations" className="quotationListLink">
              Show Quotations List
            </Link>

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
              {isGeneratingPdf ? "Preparing PDF..." : "Download Proposal PDF"}
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
            <h2>
              <span className="qoStepBadge">01</span> Vehicle Setup · Category
            </h2>

            {isLoadingVehicles ? (
              <div className="qoLoading">Loading vehicle categories...</div>
            ) : (
              <div className="qoOptionGrid three">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={`qoSelectCard ${
                      selectedCategory === category ? "active" : ""
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
            <h2>
              <span className="qoStepBadge">02</span> Vehicle Setup · Select
              Vehicle & Package
            </h2>

            {isLoadingVehicles ? (
              <div className="qoLoading">Loading vehicles...</div>
            ) : (
              <>
                <div className="qoOptionGrid two">
                  {categoryVehicles.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      type="button"
                      className={`qoSelectCard ${
                        selectedVehicleId === String(vehicle.id) ? "active" : ""
                      }`}
                      onClick={() => handleVehicleSelect(vehicle)}
                    >
                      <strong>{vehicle.name}</strong>
                      {/* <span>{getVehicleCardSubtitle(vehicle)}</span> */}
                    </button>
                  ))}
                </div>

                {selectedVehicle && selectedVehicleVariants.length === 0 && (
                  <div className="qoVariantSelector">
                    <div className="qoSectionHeader">
                      <div>
                        <h3>Selected Vehicle Details</h3>
                        <p>
                          These values are loaded from the selected vehicle and
                          will update automatically in the quotation.
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(155px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      <div
                        className="qoSelectCard active"
                        style={{
                          cursor: "default",
                          alignItems: "flex-start",
                          textAlign: "left",
                          padding: "18px 14px",
                          borderRadius: "18px",
                          minHeight: "190px",
                        }}
                      >
                        <strong>{selectedVehicle?.name}</strong>

                        <span
                          style={{
                            display: "block",
                            marginTop: "10px",
                            color: "#475569",
                            fontWeight: 800,
                          }}
                        >
                          {formatPrice(selectedVehicleRate)} / per day
                        </span>

                        {selectedVehicleLeastSellingRate <
                          selectedVehicleRate && (
                          <span
                            style={{
                              display: "block",
                              marginTop: "5px",
                              color: "#64748b",
                              fontSize: "13px",
                            }}
                          >
                            LSP: {formatPrice(selectedVehicleLeastSellingRate)}
                          </span>
                        )}

                        <span
                          style={{
                            display: "grid",
                            gap: "10px",
                            marginTop: "12px",
                            fontSize: "13px",
                            lineHeight: 1.25,
                            color: "#64748b",
                          }}
                        >
                          <span>
                            Daily KM Limit:
                            <strong
                              style={{
                                display: "block",
                                color: "#334155",
                                fontSize: "14px",
                              }}
                            >
                              {selectedPackageDetails.kmLimit} km
                            </strong>
                          </span>

                          {selectedPackageDetails.extraKm && (
                            <span>
                              Extra KM:
                              <strong
                                style={{
                                  display: "block",
                                  color: "#334155",
                                  fontSize: "14px",
                                }}
                              >
                                {selectedPackageDetails.extraKm}
                              </strong>
                            </span>
                          )}

                          {selectedPackageDetails.extraHour && (
                            <span>
                              Extra Hour:
                              <strong
                                style={{
                                  display: "block",
                                  color: "#334155",
                                  fontSize: "14px",
                                }}
                              >
                                {selectedPackageDetails.extraHour}
                              </strong>
                            </span>
                          )}

                          <span>
                            Minimum:
                            <strong
                              style={{
                                display: "block",
                                color: "#334155",
                                fontSize: "14px",
                              }}
                            >
                              {selectedPackageDetails.minimumDays} days
                            </strong>
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedVehicleVariants.length > 0 && (
                  <div className="qoVariantSelector">
                    <div className="qoSectionHeader">
                      <div>
                        <h3>Choose KM Package</h3>
                        <p>
                          Select the package. The per-day vehicle rate and daily
                          KM limit will update automatically in the quotation.
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      {selectedVehicleVariants.map((variant) => {
                        const variantPackageDetails = getPackageDetails(
                          selectedVehicle,
                          variant,
                        );
                        const isActiveVariant =
                          selectedVehicleVariantId === String(variant.id);

                        return (
                          <button
                            key={variant.id}
                            type="button"
                            className={`qoSelectCard ${
                              isActiveVariant ? "active" : ""
                            }`}
                            onClick={() => handleVariantSelect(variant)}
                            style={{
                              alignItems: "flex-start",
                              textAlign: "left",
                              padding: "18px 14px",
                              borderRadius: "18px",
                              minHeight: "205px",
                            }}
                          >
                            <strong>{variant.label}</strong>

                            <span
                              style={{
                                display: "block",
                                marginTop: "10px",
                                color: "#475569",
                                fontWeight: 800,
                              }}
                            >
                              {formatPrice(variant.pricePerDay)} / per day
                            </span>

                            {variant.leastSellingPricingPerDay && (
                              <span
                                style={{
                                  display: "block",
                                  marginTop: "5px",
                                  color: "#64748b",
                                  fontSize: "13px",
                                }}
                              ></span>
                            )}

                            <span
                              style={{
                                display: "grid",
                                gap: "10px",
                                marginTop: "14px",
                                fontSize: "13px",
                                lineHeight: 1.25,
                                color: "#64748b",
                              }}
                            >
                              <span>
                                Daily KM Limit:
                                <strong
                                  style={{
                                    display: "block",
                                    color: "#334155",
                                    fontSize: "14px",
                                  }}
                                >
                                  {variantPackageDetails.kmLimit} km
                                </strong>
                              </span>

                              {variantPackageDetails.extraKm && (
                                <span>
                                  Extra KM:
                                  <strong
                                    style={{
                                      display: "block",
                                      color: "#334155",
                                      fontSize: "14px",
                                    }}
                                  >
                                    {variantPackageDetails.extraKm}
                                  </strong>
                                </span>
                              )}

                              {variantPackageDetails.extraHour && (
                                <span>
                                  Extra Hour:
                                  <strong
                                    style={{
                                      display: "block",
                                      color: "#334155",
                                      fontSize: "14px",
                                    }}
                                  >
                                    {variantPackageDetails.extraHour}
                                  </strong>
                                </span>
                              )}

                              <span>
                                Minimum:
                                <strong
                                  style={{
                                    display: "block",
                                    color: "#334155",
                                    fontSize: "14px",
                                  }}
                                >
                                  {variantPackageDetails.minimumDays} days
                                </strong>
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="qoCard">
            <h2>
              <span className="qoStepBadge">03</span> Client Information
            </h2>

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
            <h2>
              <span className="qoStepBadge">04</span> Prepared By & Signature
            </h2>

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
                        <img
                          src={signatureSource}
                          alt="Signature crop preview"
                        />

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
            <h2>
              <span className="qoStepBadge">05</span> Campaign Configuration
            </h2>

            <div className="qoInputGrid two">
              <label>
                Region
                <select
                  value={region}
                  onChange={(event) => {
                    clearSavedQuotation();
                    setRegion(event.target.value as RegionKey);
                  }}
                >
                  <option value="chennai">Chennai</option>
                  <option value="rotn">ROTN</option>
                  <option value="kerala">Kerala</option>
                  <option value="andhara">Andhra</option>
                  <option value="telungana">Telangana</option>
                  <option value="karnataka">Karnataka</option>
                  <option value="otherStates">Other States</option>
                </select>
              </label>

              <label>
                No. of Vehicles
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={quantityInput}
                  onChange={(event) => handleQuantityChange(event.target.value)}
                  onBlur={handleQuantityBlur}
                />
                <small>Minimum vehicles: 1</small>
                {quantityError && (
                  <small style={{ color: "#dc2626", fontWeight: 700 }}>
                    {quantityError}
                  </small>
                )}
              </label>

              <label>
                No. of Days
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={daysInput}
                  onChange={(event) => handleDaysChange(event.target.value)}
                  onBlur={handleDaysBlur}
                />
                <small>Minimum booking: {minimumDays} days</small>
                {campaignDaysError && (
                  <small style={{ color: "#dc2626", fontWeight: 700 }}>
                    {campaignDaysError}
                  </small>
                )}
              </label>

              <label>
                Up & Down Charge
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pricingDetails.upDownCharge}
                  onChange={(event) =>
                    handlePricingChange("upDownCharge", event.target.value)
                  }
                />
              </label>

              <label>
                GST %
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={gstPercent}
                  onChange={(event) =>
                    handleGstPercentChange(event.target.value)
                  }
                />
              </label>
            </div>

            <div
              style={{
                marginTop: "18px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "12px",
              }}
            >
              <div className="qoSelectCard" style={{ cursor: "default" }}>
                <strong>Branding Cost</strong>
                <span>
                  {formatPrice(pricingDetails.brandingCost)} / vehicle
                </span>
                <small>{getRegionLabel(region)}</small>
              </div>

              <div className="qoSelectCard" style={{ cursor: "default" }}>
                <strong>RTO Permission</strong>
                <span>
                  {formatPrice(pricingDetails.rtoPermission)} / 1 month /
                  vehicle
                </span>
                <small>{getRegionLabel(region)}</small>
              </div>

              <div className="qoSelectCard" style={{ cursor: "default" }}>
                <strong>Promoter Cost / Day</strong>
                <span>{formatPrice(pricingDetails.promoterCost)} / day</span>
                <small>{getRegionLabel(region)}</small>
              </div>
            </div>
          </section>

          <section className="qoCard">
            <div className="qoSectionHeader">
              <div>
                <h2>
                  <span className="qoStepBadge">06</span> Commercial Pricing
                </h2>
                <p>
                  Master prices are locked. Use the Least Selling Price input to
                  reduce only the selected vehicle per-day rate within the
                  allowed range.
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
                Least Selling Price / Final Per Day Rate
                <div className="moneyInput">
                  <span>Rs.</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={leastSellingPriceInput}
                    onChange={(event) =>
                      handleLeastSellingPriceChange(event.target.value)
                    }
                    onBlur={handleLeastSellingPriceBlur}
                  />
                </div>
                <small>
                  Allowed: {formatPrice(selectedVehicleLeastSellingRate || 0)}{" "}
                  to {formatPrice(selectedVehicleMaxRate || 0)}
                </small>
                {leastSellingPriceError && (
                  <small style={{ color: "#dc2626", fontWeight: 700 }}>
                    {leastSellingPriceError}
                  </small>
                )}
              </label>

              <label>
                Per Day Vehicle Rate
                <div className="moneyInput">
                  <span>Rs.</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pricingDetails.vehicleRate}
                    readOnly
                    disabled
                  />
                </div>
                <small>
                  Master:{" "}
                  {formatPrice(
                    getDefaultPricing(
                      selectedVehicle,
                      region,
                      selectedVehicleVariant,
                    ).vehicleRate,
                  )}
                </small>
              </label>

              <label>
                Branding Cost ({getRegionLabel(region)})
                <div className="moneyInput">
                  <span>Rs.</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pricingDetails.brandingCost}
                    readOnly
                    disabled
                  />
                </div>
                <small>Auto-loaded from selected vehicle and region.</small>
              </label>

              <label>
                RTO Permission ({getRegionLabel(region)})
                <div className="moneyInput">
                  <span>Rs.</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pricingDetails.rtoPermission}
                    readOnly
                    disabled
                  />
                </div>
                <small>Auto-loaded from selected vehicle and region.</small>
              </label>

              <label>
                Promoter Cost / Day
                <div className="moneyInput">
                  <span>Rs.</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pricingDetails.promoterCost}
                    readOnly
                    disabled
                  />
                </div>
                <small>Auto-loaded from selected vehicle and region.</small>
              </label>

              <label>
                43" LED TV / Day
                <div className="moneyInput">
                  <span>Rs.</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pricingDetails.ledCost}
                    readOnly
                    disabled
                  />
                </div>
                <small>Fixed add-on rate.</small>
              </label>

              <label>
                Power Backup / Day
                <div className="moneyInput">
                  <span>Rs.</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pricingDetails.powerBackup}
                    readOnly
                    disabled
                  />
                </div>
                <small>Fixed add-on rate.</small>
              </label>
            </div>

            <div className="qoDiscountSummary">
              <div className="qoDiscountSummaryHeader">
                <strong>Vehicle Rental Discount Summary</strong>
                <span>
                  Actual selling price minus final per-day rate entered by the
                  user.
                </span>
              </div>

              <div className="qoDiscountSummaryGrid">
                <div>
                  <span>Actual Per Day Rate</span>
                  <strong>{formatPrice(vehicleActualRate)}</strong>
                </div>

                <div>
                  <span>Discount / Day</span>
                  <strong>{formatPrice(vehicleDiscountPerDay)}</strong>
                </div>

                <div>
                  <span>Final Per Day Rate</span>
                  <strong>{formatPrice(vehicleFinalRate)}</strong>
                </div>

                <div>
                  <span>Actual Vehicle Amount</span>
                  <strong>{formatPrice(vehicleActualAmount)}</strong>
                </div>

                <div className="discountHighlight">
                  <span>Discount Amount</span>
                  <strong>{formatPrice(vehicleDiscountAmount)}</strong>
                </div>

                <div className="finalHighlight">
                  <span>Remaining Vehicle Amount</span>
                  <strong>{formatPrice(vehicleRemainingAmount)}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="qoCard">
            <h2>
              <span className="qoStepBadge">07</span> Add-ons & Support
            </h2>

            <div className="qoAddonList qoAddonCardList">
              <label
                className={`qoAddon qoAddonCard ${includePromoter ? "active" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={includePromoter}
                  onChange={(event) =>
                    handlePromoterToggle(event.target.checked)
                  }
                />
                <span className="qoAddonCardBody">
                  <strong>Promoter Support</strong>
                  <em>On-ground campaign promoters</em>
                  <small>
                    {formatPrice(pricingDetails.promoterCost)} / day
                  </small>
                </span>
              </label>

              {includePromoter && (
                <div className="qoInputGrid two">
                  <label>
                    No. of Promoters
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={promoterQuantityInput}
                      onChange={(event) =>
                        handlePromoterQuantityChange(event.target.value)
                      }
                      onBlur={handlePromoterQuantityBlur}
                    />
                    <small>Default count: 1 promoter</small>
                  </label>
                </div>
              )}

              <label
                className={`qoAddon qoAddonCard ${includeLed ? "active" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={includeLed}
                  onChange={(event) => handleLedToggle(event.target.checked)}
                />
                <span className="qoAddonCardBody">
                  <strong>43" LED TV</strong>
                  <em>High-impact campaign display</em>
                  <small>{formatPrice(pricingDetails.ledCost)} / day</small>
                </span>
              </label>

              <label
                className={`qoAddon qoAddonCard ${includePowerBackup ? "active" : ""} ${includeLed ? "locked" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={includePowerBackup}
                  disabled={includeLed}
                  onChange={(event) =>
                    handlePowerBackupToggle(event.target.checked)
                  }
                />
                <span className="qoAddonCardBody">
                  <strong>Power Backup</strong>
                  <em>
                    {includeLed
                      ? 'Mandatory with 43" LED TV'
                      : "Generator for continuous run"}
                  </em>
                  <small>
                    {formatPrice(
                      pricingDetails.powerBackup ||
                        POWER_BACKUP_ADDON_RATE_PER_DAY,
                    )}{" "}
                    / day
                  </small>
                </span>
              </label>

              {addOnMessage && <p className="qoAddonNote">{addOnMessage}</p>}
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
            className={`proposalBook printableArea ${
              isCompactProposal ? "denseQuoteBook" : ""
            } ${uploadedSignature ? "hasSignatureQuote" : "noSignatureQuote"}`}
          >
            <section className="proposalDocument pdfPage quotePageOne">
              <header className="quoteTopBar">
                <div className="quoteBrandBlock">
                  <div className="quoteLogoBox">
                    <img
                      className="quoteLogoImage"
                      src={renderLogoSrc}
                      alt="Adinn logo"
                    />
                  </div>

                  <div className="quoteBrandText">
                    {/* <p className="quoteCompanyName">{COMPANY_DETAILS.name}</p> */}
                    <p className="quoteEyebrow">{COMPANY_DETAILS.title}</p>
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
                  <p>Prepared For</p>
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
                  <span>Campaign Snapshot</span>
                  <strong>
                    Selected Campaign Vehicle · {selectedVehicleDisplayName}
                  </strong>
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
                    <span>Extra KM</span>
                    <strong>{selectedPackageDetails.extraKm || "-"}</strong>
                  </div>

                  <div>
                    <span>Extra Hour</span>
                    <strong>{selectedPackageDetails.extraHour || "-"}</strong>
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
                      {
                        "All values are in INR. Final booking is subject to vehicle availability."
                      }
                    </p>
                  </div>

                  <div className="quoteGrandBadge">
                    <span style={{ color: "white" }}>Campaign Investment</span>
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

                            {item.discountAmount && item.discountAmount > 0 && (
                              <div className="quoteDiscountPills"></div>
                            )}
                          </div>
                        </td>

                        <td>
                          {item.discountAmount && item.discountAmount > 0 ? (
                            <div className="quoteRateBreakdown">
                              <span>
                                {formatPrice(item.actualRate || 0)} / day
                              </span>
                            </div>
                          ) : (
                            item.rateLabel
                          )}
                        </td>
                        <td>{item.periodLabel}</td>
                        <td>{item.quantityLabel}</td>
                        <td>
                          {item.discountAmount && item.discountAmount > 0 ? (
                            <div className="quoteAmountBreakdown">
                              <span>{formatPrice(item.actualAmount || 0)}</span>
                            </div>
                          ) : (
                            formatPrice(item.amount)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  <tfoot>
                    {totalDiscountAmount > 0 && (
                      <>
                        <tr className="quotationActualRow">
                          <td colSpan={5}>Actual Total</td>
                          <td>{formatPrice(actualSubtotal)}</td>
                        </tr>

                        <tr className="quotationDiscountRow">
                          <td colSpan={5}>Discount Amount</td>
                          <td>- {formatPrice(totalDiscountAmount)}</td>
                        </tr>
                      </>
                    )}

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
              <header className="quoteTopBar quoteTopBarSlim">
                <div className="quoteBrandBlock">
                  <div className="quoteLogoBox">
                    <img
                      className="quoteLogoImage"
                      src={renderLogoSrc}
                      alt="Adinn logo"
                    />
                  </div>
                  <div className="quoteBrandText">
                    <p className="quoteCompanyName">{COMPANY_DETAILS.name}</p>
                    <p className="quoteEyebrow">BOOKING TERMS & CONFIRMATION</p>
                    {/* <h1>Proposal · {proposalNumber}</h1> */}
                  </div>
                </div>
                <div className="quoteMetaBox">
                   <div>
                     <span>Quotation No.</span>
                    <strong>{proposalNumber}</strong>
                  </div>
                  <div>
                    <span>Prepared For</span>
                    <strong>{clientDetails.companyName || "-"}</strong>
                  </div>
                  <div>
                    <span>Valid Until</span>
                    <strong>{formatDate(validUntilDate)}</strong>
                  </div>
                </div>
              </header>

              <section className="quoteTermsPanel">
                <div className="quoteTermsHeader">
                  <div>
                    <span>Booking Terms</span>
                    <h3>Terms & Conditions</h3>
                  </div>
                  <strong>Subject to availability</strong>
                </div>

                <div className="quoteTermsBody">
                  <ol
                    className="quoteTermsTimeline"
                    aria-label="Terms and conditions"
                  >
                    {TERMS_AND_CONDITIONS.map((term, index) => (
                      <li key={term}>
                        <span className="quoteTermNumber" aria-hidden="true">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <p>{term}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>

              <section className="quoteInfoTwoCol" style={{ display: "none" }}>
                <div className="quoteInfoPanel">
                  <span className="quoteInfoEyebrow">
                    What this quotation covers
                  </span>
                  <ul>
                    <li>
                      Branded campaign vehicle for the selected duration &
                      region.
                    </li>
                    <li>Branding production and application support.</li>
                    <li>RTO permission for the campaign window.</li>
                    <li>
                      Selected optional add-ons listed in the commercial table.
                    </li>
                  </ul>
                </div>
                <div className="quoteInfoPanel">
                  <span className="quoteInfoEyebrow">Next Steps</span>
                  <ol>
                    <li>
                      Confirm the quotation in writing within{" "}
                      {COMPANY_DETAILS.validityDays} days.
                    </li>
                    <li>Share branding artwork.</li>
                    <li>Adinn team schedules deployment & shares tracking.</li>
                  </ol>
                </div>
              </section>

              <footer
                className={`quoteFooter quotePremiumFooter ${
                  uploadedSignature ? "hasSignature" : "noSignature"
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
                      For{" "}
                      {preparedByDetails.companyName || COMPANY_DETAILS.name}
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
