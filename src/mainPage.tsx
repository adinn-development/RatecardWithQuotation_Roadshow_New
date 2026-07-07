/* eslint-disable */
// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { useNavigate } from "react-router-dom";

const LOGO_SRC =
  "https://www.adinn.com/_next/static/media/AdinnLogo.80d7c577.svg";

// KARTHI ADDED
const USE_LOCAL_JSON = true; // set true for local, false for live
const VEHICLES_JSON_URL = USE_LOCAL_JSON
  ? "./vehicles.json"
  : "https://adinn-space.sgp1.cdn.digitaloceanspaces.com/roadshowRateCard/vehicles.json";

const USE_LOCAL_API = false; // set true for local, false for live
const API_BASE_URL = USE_LOCAL_API
  ? "http://localhost:3001"
  : "https://roadshow-backend.onrender.com";


// const CATEGORY_ORDER = ["Flex Branding", "Hybrid LED + Flex", "LED Vehicles"];
const CATEGORY_ORDER = ["Flex Branding", "Hybrid LED + Flex", "LED Vehicles"];


const normalizeCategory = (category?: string) => {
  const safeCategory = String(category || "").trim();

  if (safeCategory === "LED Vehicle") return "Hybrid LED + Flex";
  if (safeCategory === "Premium LED") return "LED Vehicles";
  return safeCategory;
};

const getVehicleSubLabel = (vehicle: Vehicle) => {
  if (vehicle.category === "LED Vehicle") return "LED Vehicle";
  return vehicle.type || "Vehicle";
};

type QuickSpec = {
  label: string;
  value: string;
};

type LocationCharge = {
  label: string;
  [key: string]: string | undefined;
};

type VehicleVariant = {
  id?: number | string;
  key?: number | string;
  label?: string;
  name?: string;
  kmPerDay?: number;
  kmLabel?: string;
  pricePerDay?: number;
  quickSpecs?: QuickSpec[];
  included?: string[];
};

type Vehicle = {
  id: number | string;
  hide?: boolean | string;
  hidden?: boolean | string;
  isHidden?: boolean | string;
  name: string;
  category: string;
  type: string;
  shortDescription: string;
  pricePerDay?: number;
  highlight: string;
  quickSpecs?: QuickSpec[];
  included?: string[];
  brandingStatus: string;
  addOns?: string[];
  images?: string[];
  image?: string;
  locationCharges?: LocationCharge[];
  variants?: VehicleVariant[];
  packageTotal?: string;
};

type SortOrder = "lowToHigh" | "highToLow";

const formatPrice = (price: number) =>
  `₹${Number(price || 0).toLocaleString("en-IN")}`;

const toArray = <T,>(value: T[] | null | undefined): T[] => {
  return Array.isArray(value) ? value : [];
};

const getVehicleImages = (vehicle: Vehicle) => {
  const images = toArray<string>(vehicle.images).filter(Boolean);

  if (images.length) return images;

  return vehicle.image ? [vehicle.image] : [];
};

const getVehicleQuickSpecs = (vehicle: Vehicle) => {
  return toArray<QuickSpec>(vehicle.quickSpecs);
};

const getVehicleIncluded = (vehicle: Vehicle) => {
  return toArray<string>(vehicle.included);
};

const getVehicleAddOns = (vehicle: Vehicle) => {
  return toArray<string>(vehicle.addOns);
};

const getVehicleLocationCharges = (vehicle: Vehicle) => {
  return toArray<LocationCharge>(vehicle.locationCharges);
};

const getVehicleVariants = (vehicle: Vehicle) => {
  return toArray<VehicleVariant>(vehicle.variants);
};

const getVariantKey = (variant: VehicleVariant, index: number) => {
  return String(
    variant.id ?? variant.key ?? variant.label ?? variant.name ?? index,
  );
};

const getDefaultVariant = (vehicle: Vehicle) => {
  const variants = getVehicleVariants(vehicle);
  return variants[0];
};

const getVehicleDefaultPrice = (vehicle: Vehicle) => {
  return getDefaultVariant(vehicle)?.pricePerDay ?? vehicle.pricePerDay ?? 0;
};

const isTrueLike = (value: unknown) => {
  return value === true || String(value).trim().toLowerCase() === "true";
};

const isVehicleHidden = (vehicle: Vehicle) => {
  return (
    isTrueLike(vehicle.hide) ||
    isTrueLike(vehicle.hidden) ||
    isTrueLike(vehicle.isHidden)
  );
};

const getVariantLabel = (variant: VehicleVariant) => {
  if (variant.label) return variant.label;
  if (variant.name) return variant.name;
  if (variant.kmPerDay) return `${variant.kmPerDay} km / day`;
  return "Variant";
};

const getVariantKmValue = (variant?: VehicleVariant) => {
  if (!variant) return "";
  if (variant.kmLabel) return variant.kmLabel;
  if (variant.kmPerDay) return `${variant.kmPerDay} km/day`;
  return "";
};

const getEffectiveQuickSpecs = (
  vehicle: Vehicle,
  selectedVariant?: VehicleVariant,
) => {
  const variantQuickSpecs = toArray<QuickSpec>(selectedVariant?.quickSpecs);

  if (variantQuickSpecs.length) {
    return variantQuickSpecs;
  }

  const baseQuickSpecs = getVehicleQuickSpecs(vehicle);
  const kmValue = getVariantKmValue(selectedVariant);

  if (!kmValue) {
    return baseQuickSpecs;
  }

  let hasKmSpec = false;

  const nextQuickSpecs = baseQuickSpecs.map((spec) => {
    const label = String(spec.label || "").toLowerCase();

    if (label === "km" || (label.includes("km") && !label.includes("extra"))) {
      hasKmSpec = true;
      return {
        ...spec,
        value: kmValue,
      };
    }

    return spec;
  });

  if (!hasKmSpec) {
    return [
      {
        label: "KM",
        value: kmValue,
      },
      ...nextQuickSpecs,
    ];
  }

  return nextQuickSpecs;
};

const getEffectiveIncluded = (
  vehicle: Vehicle,
  selectedVariant?: VehicleVariant,
) => {
  const variantIncluded = toArray<string>(selectedVariant?.included);

  if (variantIncluded.length) {
    return variantIncluded;
  }

  const baseIncluded = getVehicleIncluded(vehicle);
  const kmValue = getVariantKmValue(selectedVariant);

  if (!kmValue) {
    return baseIncluded;
  }

  const normalizedKmValue = kmValue.replace(/\s+/g, " ");
  let fuelLineUpdated = false;

  const nextIncluded = baseIncluded.map((item) => {
    if (/fuel\s+within/i.test(item)) {
      fuelLineUpdated = true;
      return `Fuel within ${normalizedKmValue}`;
    }

    return item;
  });

  if (!fuelLineUpdated) {
    return [...nextIncluded, `Fuel within ${normalizedKmValue}`];
  }

  return nextIncluded;
};

type LocationChargeColumn = {
  key: string;
  label: string;
  fallbackKeys: string[];
};

const LOCATION_CHARGE_COLUMNS: LocationChargeColumn[] = [
  {
    key: "general",
    label: "General",
    fallbackKeys: ["general", "tamilNadu", "Tamilnadu", "tamilnadu", "tn"],
  },
  {
    key: "chennai",
    label: "Chennai",
    fallbackKeys: ["chennai"],
  },
  {
    key: "rotn",
    label: "ROTN",
    fallbackKeys: ["rotn", "rot", "restOfTamilNadu", "restoftamilnadu"],
  },
  {
    key: "kerala",
    label: "Kerala",
    fallbackKeys: ["kerala", "Kerala"],
  },
  {
    key: "andhra",
    label: "Andhra",
    fallbackKeys: [
      "andhra",
      "andhara",
      "andhraPradesh",
      "andhrapradesh",
      "andharaPradesh",
      "andharapradesh",
      "ap",
    ],
  },
  {
    key: "telangana",
    label: "Telangana",
    fallbackKeys: ["telangana", "telungana", "telengana", "ts"],
  },
  {
    key: "karnataka",
    label: "Karnataka",
    fallbackKeys: ["karnataka", "ka"],
  },
  {
    key: "otherStates",
    label: "Other States",
    fallbackKeys: [
      "otherStates",
      "otherstates",
      "otherState",
      "otherstate",
      "others",
      "other",
    ],
  },
];

const normalizeChargeKey = (value: string) =>
  value.replace(/[^a-z0-9]/gi, "").toLowerCase();

const getLocationChargeValue = (
  row: LocationCharge,
  column: LocationChargeColumn,
) => {
  for (const key of column.fallbackKeys) {
    const exactValue = row[key];

    if (exactValue !== undefined && exactValue !== "") {
      return exactValue;
    }
  }

  const normalizedEntries = Object.entries(row).reduce<Record<string, string>>(
    (entries, [key, value]) => {
      if (key !== "label" && value !== undefined && value !== "") {
        entries[normalizeChargeKey(key)] = value;
      }

      return entries;
    },
    {},
  );

  for (const key of column.fallbackKeys) {
    const normalizedValue = normalizedEntries[normalizeChargeKey(key)];

    if (normalizedValue !== undefined && normalizedValue !== "") {
      return normalizedValue;
    }
  }

  return "";
};

const parseChargeAmount = (value?: string | number) => {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const numericText = String(value).replace(/[^\d.-]/g, "");
  const parsed = Number(numericText);

  return Number.isFinite(parsed) ? parsed : 0;
};

const formatLocationChargeValue = (value?: string | number) => {
  const amount = parseChargeAmount(value);

  if (!amount) return "-";

  return formatPrice(amount);
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

const isVehicleArray = (value: unknown): value is Vehicle[] => {
  return Array.isArray(value);
};

const hasTextValue = (value: unknown) => {
  return String(value ?? "").trim().length > 0;
};

const isValidVehicleRecord = (value: unknown): value is Vehicle => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const vehicle = value as Vehicle;

  return (
    hasTextValue(vehicle.id) &&
    hasTextValue(vehicle.name) &&
    hasTextValue(vehicle.category)
  );
};

const getValidVehicleRecords = (vehicleList: unknown) => {
  if (!Array.isArray(vehicleList)) return [];
  return vehicleList.filter(isValidVehicleRecord);
};

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const images = useMemo(() => {
    return getVehicleImages(vehicle);
  }, [vehicle]);

  const vehicleVariants = useMemo(() => getVehicleVariants(vehicle), [vehicle]);
  const hasVariants = vehicleVariants.length > 0;

  const [selectedVariantKey, setSelectedVariantKey] = useState(() =>
    hasVariants ? getVariantKey(vehicleVariants[0], 0) : "",
  );

  const selectedVariant = useMemo(() => {
    if (!hasVariants) return undefined;

    return (
      vehicleVariants.find(
        (variant, index) =>
          getVariantKey(variant, index) === selectedVariantKey,
      ) || vehicleVariants[0]
    );
  }, [hasVariants, selectedVariantKey, vehicleVariants]);

  const effectivePrice =
    selectedVariant?.pricePerDay ?? vehicle.pricePerDay ?? 0;

  const effectiveQuickSpecs = useMemo(() => {
    return getEffectiveQuickSpecs(vehicle, selectedVariant);
  }, [vehicle, selectedVariant]);

  const effectiveIncluded = useMemo(() => {
    return getEffectiveIncluded(vehicle, selectedVariant);
  }, [vehicle, selectedVariant]);

  const imagesKey = images.join("|");
  const [activeImage, setActiveImage] = useState(images[0] || "");
  const locationCharges = useMemo(
    () => getVehicleLocationCharges(vehicle),
    [vehicle],
  );
  const hasLocationCharges = locationCharges.length > 0;
  const displayCategory = normalizeCategory(vehicle.category);

  useEffect(() => {
    setActiveImage(images[0] || "");
  }, [vehicle.id, imagesKey]);

  useEffect(() => {
    if (!hasVariants) {
      setSelectedVariantKey("");
      return;
    }

    setSelectedVariantKey(getVariantKey(vehicleVariants[0], 0));
  }, [vehicle.id, hasVariants, vehicleVariants]);

  return (
    <article className="vehicleCard">
      <section className="mediaPanel">
        <div className="mediaTop">
          <span>{displayCategory}</span>
          <small>{getVehicleSubLabel(vehicle)}</small>
        </div>

        <div className="mainImageBox">
          {activeImage ? (
            <img src={activeImage} alt={vehicle.name} />
          ) : (
            <div className="emptyImage">Vehicle Image</div>
          )}
        </div>

        {images.length > 1 && (
          <div className="thumbStrip">
            {images.map((image, index) => (
              <button
                key={`${vehicle.id}-${image}-${index}`}
                type="button"
                className={activeImage === image ? "active" : ""}
                onClick={() => setActiveImage(image)}
                aria-label={`Show ${vehicle.name} image ${index + 1}`}
              >
                <img
                  src={image}
                  alt={`${vehicle.name} thumbnail ${index + 1}`}
                />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="detailsPanel">
        <div className="titleRow">
          <div>
            <h2>{vehicle.name}</h2>
            {vehicle.shortDescription && <p>{vehicle.shortDescription}</p>}
          </div>

          <div className="priceBox">
            <span>Per Day</span>
            <strong>{formatPrice(effectivePrice)}</strong>
          </div>
        </div>

        {vehicle.highlight && <div className="highlightBar">{vehicle.highlight}</div>}

        {hasVariants && (
          <div
            className="variantSelector"
            style={{
              marginTop: "16px",
              padding: "14px",
              border: "1px solid #fee2e2",
              borderRadius: "18px",
              background: "#fff7f7",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <strong style={{ color: "#e60012" }}>Choose KM Variant</strong>
              <span style={{ color: "#6b7280", fontSize: "13px" }}>
                Branding, RTO and promoter charges remain same
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              {vehicleVariants.map((variant, index) => {
                const variantKey = getVariantKey(variant, index);
                const isActive = selectedVariantKey === variantKey;

                return (
                  <button
                    key={variantKey}
                    type="button"
                    onClick={() => setSelectedVariantKey(variantKey)}
                    style={{
                      border: isActive
                        ? "2px solid #e60012"
                        : "1px solid #fecaca",
                      background: isActive ? "#e60012" : "#ffffff",
                      color: isActive ? "#ffffff" : "#111827",
                      borderRadius: "999px",
                      padding: "10px 14px",
                      cursor: "pointer",
                      fontWeight: 800,
                      lineHeight: 1.2,
                    }}
                  >
                    <span>{getVariantLabel(variant)}</span>
                    <small
                      style={{
                        display: "block",
                        marginTop: "4px",
                        color: isActive ? "#ffffff" : "#e60012",
                        fontWeight: 900,
                      }}
                    >
                      {formatPrice(variant.pricePerDay ?? 0)} / day
                    </small>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {effectiveQuickSpecs.length > 0 && (
          <div className="specGrid">
            {effectiveQuickSpecs.map((spec, index) => (
              <div
                className="specCard"
                key={`${spec.label || "spec"}-${index}`}
              >
                <span>{spec.label || "Spec"}</span>
                <strong>{spec.value || "-"}</strong>
              </div>
            ))}
          </div>
        )}

        <div className="infoGrid">
          <div className="infoCard">
            <h3>Included in per day cost</h3>
            <ul>
              {effectiveIncluded.length > 0 ? (
                effectiveIncluded.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>Included details not added.</li>
              )}
            </ul>
          </div>

          <div className="infoCard redTint">
            <h3>{vehicle.brandingStatus || "Add-ons"}</h3>
            <ul>
              {getVehicleAddOns(vehicle).length > 0 ? (
                getVehicleAddOns(vehicle).map((item) => (
                  <li key={item}>{item}</li>
                ))
              ) : (
                <li>No add-ons listed.</li>
              )}
            </ul>
          </div>
        </div>

        {hasLocationCharges && (
          <details className="locationDetails">
            <summary>View location-wise charges</summary>
            <div className="locationTableWrap" style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: "900px",
                  tableLayout: "fixed",
                }}
              >
                <thead>
                  <tr>
                    <th>Charge</th>
                    {LOCATION_CHARGE_COLUMNS.map((column) => (
                      <th key={column.key}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {locationCharges.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      {LOCATION_CHARGE_COLUMNS.map((column) => (
                        <td key={`${row.label}-${column.key}`}>
                          {formatLocationChargeValue(
                            getLocationChargeValue(row, column),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}

        {vehicle.packageTotal && (
          <div className="packageBox">
            <span>Package</span>
            <strong>{vehicle.packageTotal}</strong>
          </div>
        )}
      </section>
    </article>
  );
}

export default function MainApp() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [vehiclesError, setVehiclesError] = useState("");

  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("lowToHigh");
  const [showJsonPanel, setShowJsonPanel] = useState(false);
  const [jsonMessage, setJsonMessage] = useState("");

  const logoClickCountRef = useRef(0);
  const logoTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const brandAreaRef = useRef<HTMLDivElement | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const loadCloudVehicles = async () => {
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

        setVehicles(cloudVehicles);
      } catch (error) {
        setVehiclesError(
          error instanceof Error
            ? error.message
            : "Unable to load cloud vehicles.",
        );
      } finally {
        setIsLoadingVehicles(false);
      }
    };

    loadCloudVehicles();
  }, []);

  useEffect(() => {
    if (!showJsonPanel) return;

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (!brandAreaRef.current) return;
      if (!brandAreaRef.current.contains(event.target as Node)) {
        setShowJsonPanel(false);
        setJsonMessage("");
        logoClickCountRef.current = 0;
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [showJsonPanel]);

  // const visibleVehicles = useMemo(() => {
  //   return getValidVehicleRecords(vehicles).filter(
  //     (vehicle) => !isVehicleHidden(vehicle),
  //   );
  // }, [vehicles]);
  const visibleVehicles = useMemo(() => {
  return getValidVehicleRecords(vehicles).filter((vehicle) => {
    if (isVehicleHidden(vehicle)) return false;

    // Hide Innovative Model only on Main Page
    if (normalizeCategory(vehicle.category) === "Innovative Model") {
      return false;
    }

    return true;
  });
}, [vehicles]);

  const ignoredVehicleCount = vehicles.length - getValidVehicleRecords(vehicles).length;
  const hiddenVehicleCount =
    vehicles.length - ignoredVehicleCount - visibleVehicles.length;

  const categories = useMemo(() => {
    const normalizedCategories = new Set(
      visibleVehicles.map((vehicle) => normalizeCategory(vehicle.category)),
    );

    const orderedCategories = CATEGORY_ORDER.filter((item) =>
      normalizedCategories.has(item),
    );

    const extraCategories = Array.from(normalizedCategories).filter(
      (item) => !CATEGORY_ORDER.includes(item),
    );

    return ["All", ...orderedCategories, ...extraCategories];
  }, [visibleVehicles]);

  const categoryCounts = useMemo(() => {
    return visibleVehicles.reduce<Record<string, number>>(
      (counts, vehicle) => {
        const displayCategory = normalizeCategory(vehicle.category);
        counts.All += 1;
        counts[displayCategory] = (counts[displayCategory] || 0) + 1;
        return counts;
      },
      { All: 0 },
    );
  }, [visibleVehicles]);

  const selectedCategoryCount = categoryCounts[category] || 0;

  const totalRateVariants = useMemo(() => {
    return visibleVehicles.reduce((total, vehicle) => {
      const variantCount = getVehicleVariants(vehicle).length;
      return total + (variantCount > 0 ? variantCount : 1);
    }, 0);
  }, [visibleVehicles]);

  const filteredVehicles = useMemo(() => {
    return visibleVehicles
      .filter((vehicle) => {
        const displayCategory = normalizeCategory(vehicle.category);
        const matchesCategory =
          category === "All" || displayCategory === category;
        const variantKeyword = getVehicleVariants(vehicle)
          .map(
            (variant) =>
              `${getVariantLabel(variant)} ${variant.kmPerDay || ""} ${variant.pricePerDay}`,
          )
          .join(" ");
        const keyword = [
          vehicle.name,
          vehicle.type,
          vehicle.category,
          displayCategory,
          variantKeyword,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesSearch = keyword.includes(query.toLowerCase().trim());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortOrder === "highToLow") {
          return getVehicleDefaultPrice(b) - getVehicleDefaultPrice(a);
        }
        return getVehicleDefaultPrice(a) - getVehicleDefaultPrice(b);
      });
  }, [visibleVehicles, category, query, sortOrder]);

  const handleAmountSortClick = () => {
    setSortOrder((currentSortOrder) =>
      currentSortOrder === "lowToHigh" ? "highToLow" : "lowToHigh",
    );
  };

  const handleLogoClick = () => {
    logoClickCountRef.current += 1;

    if (logoTimerRef.current) {
      window.clearTimeout(logoTimerRef.current);
    }

    logoTimerRef.current = window.setTimeout(() => {
      logoClickCountRef.current = 0;
    }, 900);

    if (logoClickCountRef.current >= 3) {
      setShowJsonPanel(true);
      setJsonMessage("");
      logoClickCountRef.current = 0;

      if (logoTimerRef.current) {
        window.clearTimeout(logoTimerRef.current);
      }
    }
  };

  const handleCloseJsonPanel = () => {
    setShowJsonPanel(false);
    setJsonMessage("");
    logoClickCountRef.current = 0;
  };

  const handleDownloadJson = async () => {
    try {
      setJsonMessage("Downloading cloud JSON...");
      const response = await fetch(`${VEHICLES_JSON_URL}?v=${Date.now()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to download cloud vehicles.json.");
      }

      const cloudVehicles = await response.json();

      if (!isVehicleArray(cloudVehicles)) {
        throw new Error("Cloud JSON is not a valid vehicle array.");
      }

      downloadJsonFile(cloudVehicles, "vehicles.json");
      setJsonMessage("Cloud JSON downloaded successfully.");
    } catch (error) {
      setJsonMessage(
        error instanceof Error
          ? error.message
          : "Unable to download cloud JSON.",
      );
    }
  };

  const handleUploadJson = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setJsonMessage("Uploading JSON to cloud...");
      const text = await file.text();
      const uploadedJson = JSON.parse(text);

      if (!isVehicleArray(uploadedJson)) {
        throw new Error("The uploaded JSON must be an array of vehicles.");
      }

      const response = await fetch(`${API_BASE_URL}/api/update-vehicles-json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uploadedJson),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to update cloud vehicles.json.",
        );
      }

      setVehicles(uploadedJson);
      setCategory("All");
      setQuery("");
      setSortOrder("lowToHigh");
      setJsonMessage("Cloud vehicles.json updated successfully.");
    } catch (error) {
      setJsonMessage(
        error instanceof Error
          ? error.message
          : "Invalid JSON file. Please check and upload again.",
      );
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="app">
      <header className="hero">
        <nav className="navbar">
          <div className="brandArea" ref={brandAreaRef}>
            <button
              type="button"
              className="brandGroup brandButton"
              onClick={handleLogoClick}
            >
              <div className="brandLogoImage">
                <img src={LOGO_SRC} alt="Adinn Roadshows" />
              </div>
              <div>
                <strong>Adinn Roadshows</strong>
                <span>Vehicle Rate Card</span>
              </div>
            </button>

            {showJsonPanel && (
              <div className="jsonPanel">
                <button
                  type="button"
                  className="jsonCloseBtn"
                  onClick={handleCloseJsonPanel}
                  aria-label="Close JSON manager"
                >
                  ×
                </button>
                <div>
                  <strong>JSON Manager</strong>
                  <span>Download, edit and upload vehicles.json</span>
                </div>
                <div className="jsonActions">
                  <button type="button" onClick={handleDownloadJson}>
                    Download JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload JSON
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleUploadJson}
                    hidden
                  />
                </div>
                {jsonMessage && <p>{jsonMessage}</p>}
              </div>
            )}
          </div>

          <div
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              fontWeight: "bold",
              color: "#b91c1c",
              border: "1px solid #b91c1c",
              cursor: "pointer",
            }}
            onClick={() => navigate("/roadshowQO")}
          >
            Quotation
          </div>
        </nav>

        <div className="heroContent">
          <div>
            <span className="eyebrow">
              Premium Outdoor Advertising Vehicles
            </span>
            <h1>Roadshow rate card with images, pricing and specifications.</h1>
            <p>
              Browse Flex branding, LED and hybrid roadshow vehicles with
              per-day cost, km limits, minimum days, add-ons and location-wise
              charges.
            </p>
          </div>

          <div
            className="heroStats singleStat"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/roadshowQO")}
          >
            <div>
              <span>Total Variants</span>
              <strong>{totalRateVariants}</strong>
            </div>
          </div>
        </div>
      </header>

      <main className="mainWrap">
        <section className="filterCard">
          <div>
            <span className="sectionKicker">Choose Vehicle</span>
            <h2>Available rate cards</h2>
            <p className="selectedCount">
              {isLoadingVehicles
                ? "Loading vehicles..."
                : category === "All"
                  ? `${selectedCategoryCount} vehicles available`
                  : `${selectedCategoryCount} vehicles in ${category}`}
            </p>
          </div>

          <div className="filterControls">
            <div className="filterTopRow">
              <input
                type="search"
                placeholder="Search vehicle..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <button
                type="button"
                className="amountSortBtn"
                onClick={handleAmountSortClick}
                aria-label="Sort vehicles by amount"
              >
                <span>Amount</span>
                <strong>
                  {sortOrder === "lowToHigh" ? "Low - High" : "High - Low"}
                </strong>
                <em>{sortOrder === "lowToHigh" ? "↑" : "↓"}</em>
              </button>
            </div>

            <div className="filterTabs">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={category === item ? "active" : ""}
                  onClick={() => setCategory(item)}
                >
                  <span>{item}</span>
                  <small className="tabCount">
                    {categoryCounts[item] || 0}
                  </small>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="vehicleList">
          {isLoadingVehicles ? (
            <div className="emptyState">Loading vehicles from cloud...</div>
          ) : vehiclesError ? (
            <div className="emptyState">{vehiclesError}</div>
          ) : filteredVehicles.length > 0 ? (
            filteredVehicles.map((vehicle) => (
              <VehicleCard vehicle={vehicle} key={vehicle.id} />
            ))
          ) : (
            <div className="emptyState">
              No vehicles found. Try another search or filter.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
