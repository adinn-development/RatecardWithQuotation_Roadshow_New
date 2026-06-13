/* eslint-disable */
// @ts-nocheck

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./RoadshowQuotationList.css";
import "./RoadshowQuotationList.approval.css";

const USE_LOCAL_API = false; // set true for local, false for live
const API_BASE_URL = USE_LOCAL_API
  ? "http://localhost:3001"
  : "https://roadshow-backend.onrender.com";

const ROADSHOW_QUOTATION_API_URL = `${API_BASE_URL}/api/roadshow-quotations`;
const DEFAULT_LOGO_SRC = "/adinn-logo.png";

const COMPANY_FALLBACKS = {
  companyName: "Adinn Advertising Services Limited",
  gstNumber: "GSTIN: 33AAGCA2094M1ZK",
  address:
    "29,2A, 1st Cross Street, Bypass Rd, Vanamamalai Nagar, Kalavasal, Madurai, Tamil Nadu 625010",
};

type RoadshowQuotationItem = {
  _id: string;
  quotationNumber: string;
  quotationDate?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;

  clientDetails?: {
    companyName?: string;
    clientName?: string;
    contactNumber?: string;
    email?: string;
    campaignName?: string;
    campaignLocation?: string;
  };

  preparedByDetails?: {
    staffName?: string;
    staffPhone?: string;
    companyName?: string;
    email?: string;
  };

  campaign?: {
    campaignName?: string;
    campaignLocation?: string;
  };

  pricing?: {
    totalDiscountAmount?: number;
    grandTotal?: number;
    pricingDetails?: {
      brandingCostDiscount?: number;
      rtoPermissionDiscount?: number;
    };
  };

  approval?: {
    required?: boolean;
    status?: string;
    requestedAt?: string;
    requestedBy?: string;
    approvedAt?: string;
    approvedBy?: string;
  };

  pdf?: {
    status?: string;
    fileName?: string;
    publicUrl?: string;
    cdnUrl?: string;
    downloadUrl?: string;
    uploadedAt?: string;
  };
};

type PaginationData = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const formatDisplayDate = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDisplayDateTime = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  const datePart = date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  const timePart = date
    .toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    })
    .toLowerCase();

  return `${datePart} / ${timePart}`;
};

const formatPrice = (amount?: number) => {
  const safeAmount = Number(amount || 0);

  return `₹\u00A0${Math.round(Number.isFinite(safeAmount) ? safeAmount : 0).toLocaleString(
    "en-IN",
  )}`;
};

const safeText = (value?: string | number, fallback = "-") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const getStaffDisplay = (item: RoadshowQuotationItem) => {
  const staffName = item.preparedByDetails?.staffName || "-";
  const staffPhone = item.preparedByDetails?.staffPhone || "-";

  return `${staffName}/+91 ${staffPhone}`;
};

const getCompanyCampaignDisplay = (item: RoadshowQuotationItem) => {
  const companyName = item.clientDetails?.companyName || "-";
  const campaignName =
    item.clientDetails?.campaignName || item.campaign?.campaignName || "-";

  return `${companyName}/${campaignName}`;
};

const getPdfUrl = (item: RoadshowQuotationItem) => {
  return item.pdf?.publicUrl || item.pdf?.cdnUrl || item.pdf?.downloadUrl || "";
};

const getStatusMeta = (status?: string) => {
  switch (status) {
    case "waiting_for_approval":
      return { label: "Waiting for approval", className: "waiting" };
    case "approved":
      return { label: "Approved", className: "approved" };
    case "pdf_uploaded":
      return { label: "PDF Uploaded", className: "uploaded" };
    case "failed":
      return { label: "Failed", className: "failed" };
    default:
      return { label: "Saved", className: "saved" };
  }
};

const getQuotationSource = (quotation: any = {}) => {
  if (quotation?.rawPayload && typeof quotation.rawPayload === "object") {
    return {
      ...quotation.rawPayload,
      _id: quotation._id,
      status: quotation.status,
      approval: quotation.approval || quotation.rawPayload.approval,
      pdf: quotation.pdf || quotation.rawPayload.pdf,
      createdAt: quotation.createdAt,
      updatedAt: quotation.updatedAt,
      quotationNumber:
        quotation.quotationNumber || quotation.rawPayload.quotationNumber,
      quotationDate: quotation.quotationDate || quotation.rawPayload.quotationDate,
    };
  }

  return quotation || {};
};

const getQuotationLineItems = (quotation: any = {}) => {
  const source = getQuotationSource(quotation);
  const items =
    source?.pricing?.quoteLineItems ||
    quotation?.pricing?.quoteLineItems ||
    source?.rawPayload?.pricing?.quoteLineItems ||
    [];

  if (!Array.isArray(items)) return [];

  return items.map((item, index) => ({
    ...item,
    serialNumber: item.serialNumber || index + 1,
    amount: Number(item.amount || 0),
    actualAmount: Number(item.actualAmount || 0),
    discountAmount: Number(item.discountAmount || 0),
  }));
};

const hasLineItemDiscount = (item: any) => {
  return Math.max(Number(item?.discountAmount || 0), 0) > 0;
};

const getSelectedAddOnsText = (quotation: any = {}) => {
  const source = getQuotationSource(quotation);
  const selectedAddOns = source?.addOns?.selectedAddOns || [];

  if (Array.isArray(selectedAddOns) && selectedAddOns.length) {
    return selectedAddOns.join(", ");
  }

  return "No Optional Add-Ons Selected";
};

const getCampaignVehicleDisplay = (quotation: any = {}) => {
  const source = getQuotationSource(quotation);
  const campaign = source.campaign || {};
  const vehicle = source.vehicle || {};
  const snapshot =
    vehicle.selectedVehicleVariantSnapshot || vehicle.selectedVehicleSnapshot || {};
  const lineItems = getQuotationLineItems(source);

  const vehicleName =
    campaign.selectedVehicleVariantLabel ||
    snapshot.label ||
    snapshot.name ||
    lineItems.find((item) => item.label === "Vehicle Rental")?.description ||
    "Selected Vehicle";

  const kmLabel =
    campaign.selectedVehicleVariantDailyKmLabel ||
    (campaign.selectedVehicleVariantKmPerDay
      ? `${campaign.selectedVehicleVariantKmPerDay} Km / Day`
      : "");

  return kmLabel ? `${vehicleName} - ${kmLabel}` : vehicleName;
};

const getQuotationDateDisplay = (quotation: any = {}) => {
  const source = getQuotationSource(quotation);

  return (
    source?.quotation?.proposalDateDisplay ||
    formatDisplayDate(source?.quotation?.proposalDate) ||
    formatDisplayDate(source?.quotationDate) ||
    formatDisplayDate(source?.createdAt)
  );
};

const fetchRoadshowQuotationById = async (quotationId: string) => {
  const response = await fetch(`${ROADSHOW_QUOTATION_API_URL}/${quotationId}`, {
    method: "GET",
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to fetch quotation details.");
  }

  return result.data;
};

const approveRoadshowQuotation = async ({
  quotationId,
  password,
}: {
  quotationId: string;
  password: string;
}) => {
  const response = await fetch(
    `${ROADSHOW_QUOTATION_API_URL}/${quotationId}/approve`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    },
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to approve quotation.");
  }

  return result.data;
};

const QuotationProtectedPreview = ({ quotation }: { quotation: any }) => {
  const source = getQuotationSource(quotation);
  const company = source.company || {};
  const preparedBy = source.preparedByDetails || {};
  const client = source.clientDetails || {};
  const quote = source.quotation || {};
  const campaign = source.campaign || {};
  const pricing = source.pricing || {};
  const pricingDetails = pricing.pricingDetails || {};
  const lineItems = getQuotationLineItems(source);
  const termsAndConditions = Array.isArray(source.termsAndConditions)
    ? source.termsAndConditions
    : [];
  const statusMeta = getStatusMeta(source.status);
  const logoSrc =
    source.assets?.logo?.displayLogoSrc ||
    source.assets?.logo?.defaultLogoSrc ||
    company.displayLogoSrc ||
    company.defaultLogoSrc ||
    DEFAULT_LOGO_SRC;

  const quotationNumber =
    source.quotationNumber ||
    quote.displayedProposalNumber ||
    quote.draftProposalNumber ||
    "-";

  const staffPhone = safeText(
    preparedBy.staffPhone || preparedBy.staff?.phoneNumber,
    "-",
  );

  const subtotal = Number(pricing.subtotal || 0);
  const totalDiscountAmount = Number(pricing.totalDiscountAmount || 0);
  const actualSubtotal = Number(pricing.actualSubtotal || subtotal + totalDiscountAmount);
  const gstPercent = Number(pricing.gstPercent ?? campaign.gstPercent ?? 18);
  const gstAmount = Number(pricing.gstAmount || 0);
  const grandTotal = Number(pricing.grandTotal || 0);
  const advanceAmount = Number(pricing.advanceAmount || 0);
  const advancePercent = Number(pricing.advancePercent || 50);

  const showDiscountColumns = lineItems.some(hasLineItemDiscount);
  const densePreview = lineItems.length >= 6;

  const campaignInfo = [
    {
      label: "Campaign",
      value: client.campaignName || campaign.campaignName || "-",
    },
    {
      label: "Location",
      value: client.campaignLocation || campaign.campaignLocation || "-",
    },
    {
      label: "No. of Vehicles",
      value: campaign.quantity || "-",
    },
    {
      label: "Campaign Duration",
      value: campaign.days ? `${campaign.days} Days` : "-",
    },
    {
      label: "Daily KM Limit",
      value:
        campaign.selectedVehicleVariantDailyKmLabel ||
        (campaign.kmLimit ? `${campaign.kmLimit} Km/day` : "-"),
    },
    {
      label: "Extra KM",
      value: campaign.selectedVehicleVariantExtraKm ||
        (campaign.extraKmRate ? `${formatPrice(campaign.extraKmRate)} / Km` : "-"),
    },
    {
      label: "Extra Hour",
      value: campaign.selectedVehicleVariantExtraHour ||
        (campaign.extraHourRate ? `${formatPrice(campaign.extraHourRate)} / Hour` : "-"),
    },
    {
      label: "Add-Ons",
      value: getSelectedAddOnsText(source),
    },
  ];

  return (
    <div className={`approvalPdfLikeBook ${densePreview ? "denseQuoteBook" : ""}`}>
      <article className="approvalPdfLikePage">
        <div className="approvalPreviewRibbon">
          <span>Protected Approval Preview</span>
          <strong className={`quotationStatusBadge ${statusMeta.className}`}>
            {statusMeta.label}
          </strong>
        </div>

        <header className="approvalQuoteHeaderCard">
          <div className="approvalQuoteLogoBox">
            <img src={logoSrc} alt="ADINN" />
          </div>

          <div className="approvalQuoteCompanyBlock">
            <h1>{safeText(preparedBy.companyName || company.name || COMPANY_FALLBACKS.companyName)}</h1>
            <strong>{safeText(preparedBy.gstNumber || COMPANY_FALLBACKS.gstNumber)}</strong>
            <p>{safeText(preparedBy.address || COMPANY_FALLBACKS.address)}</p>
          </div>
        </header>

        <section className="approvalQuotePartyGrid">
          <div className="approvalQuotePartyCard">
            <p>Bill To</p>
            <h2>{safeText(client.companyName)}</h2>
            <span>{safeText(client.clientName)}</span>
            {client.gstNumber && <span>GST Number: {client.gstNumber}</span>}
            {client.billingAddress && <span>{client.billingAddress}</span>}
            {client.contactNumber && <span>+91 {client.contactNumber}</span>}
            {client.email && <span>{client.email}</span>}
          </div>

          <div className="approvalQuoteMetaCard">
            <p>Quote & Contact</p>
            <div>
              <span>Date</span>
              <strong>{getQuotationDateDisplay(source)}</strong>
            </div>
            <div>
              <span>Quotation No</span>
              <strong>{quotationNumber}</strong>
            </div>
            <div>
              <span>Account Manager</span>
              <strong>{safeText(preparedBy.staffName || preparedBy.staff?.name)}</strong>
            </div>
            <div>
              <span>Email ID</span>
              <strong>{safeText(preparedBy.email)}</strong>
            </div>
            <div>
              <span>Phone Number</span>
              <strong>{staffPhone === "-" ? "-" : `+91 ${staffPhone}`}</strong>
            </div>
          </div>
        </section>

        <section className="approvalCampaignCard">
          <div className="approvalSectionTitle">
            <span>Campaign Snapshot</span>
            <strong>Selected Campaign Vehicle - {getCampaignVehicleDisplay(source)}</strong>
          </div>

          <div className="approvalCampaignGrid">
            {campaignInfo.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="approvalQuoteTableCard">
          <div className="approvalQuoteTableHead">
            <div>
              <span>Commercial Summary</span>
              <p>Prepared for approval review. Download and print controls are intentionally not available before approval.</p>
            </div>
            <div className="approvalGrandBadge">
              <span>Grand Total</span>
              <strong>{formatPrice(grandTotal)}</strong>
            </div>
          </div>

          <table className="approvalQuotationTable">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Particulars</th>
                <th>Rate</th>
                <th>Period</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>

            <tbody>
              {lineItems.length ? (
                lineItems.map((item) => {
                  const itemHasDiscount = hasLineItemDiscount(item);
                  const actualAmount = Number(item.actualAmount || item.amount || 0);
                  const discountAmount = Number(item.discountAmount || 0);
                  const finalAmount = Number(item.amount || 0);

                  return (
                    <tr key={`${item.serialNumber}-${item.label}`}>
                      <td>{item.serialNumber}</td>
                      <td>
                        <div className="approvalParticularBlock">
                          <strong>{safeText(item.label)}</strong>
                          <p>{safeText(item.description, "")}</p>
                          {itemHasDiscount && (
                            <div className="approvalDiscountPills">
                              <span>Actual {formatPrice(actualAmount)}</span>
                              <span>Discount {formatPrice(discountAmount)}</span>
                              <span>Final {formatPrice(finalAmount)}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {itemHasDiscount ? (
                          <div className="approvalRateBreakdown">
                            <span>
                              <em>Actual</em>
                              <strong>{formatPrice(item.actualRate || 0)}</strong>
                            </span>
                            <span className="discountLine">
                              <em>Discount</em>
                              <strong>- {formatPrice(item.discountRate || item.discountAmount || 0)}</strong>
                            </span>
                            <span>
                              <em>Quoted</em>
                              <strong>{safeText(item.rateLabel)}</strong>
                            </span>
                          </div>
                        ) : (
                          safeText(item.rateLabel)
                        )}
                      </td>
                      <td>{safeText(item.periodLabel)}</td>
                      <td>{safeText(item.quantityLabel)}</td>
                      <td>
                        {itemHasDiscount ? (
                          <div className="approvalAmountBreakdown">
                            <span>
                              <em>Actual</em>
                              <strong>{formatPrice(actualAmount)}</strong>
                            </span>
                            <span className="discountLine">
                              <em>Discount</em>
                              <strong>- {formatPrice(discountAmount)}</strong>
                            </span>
                            <span>
                              <em>Final</em>
                              <strong>{formatPrice(finalAmount)}</strong>
                            </span>
                          </div>
                        ) : (
                          formatPrice(finalAmount)
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="approvalEmptyCell">
                    No quotation line items available.
                  </td>
                </tr>
              )}
            </tbody>

            <tfoot>
              {showDiscountColumns && (
                <>
                  <tr>
                    <td colSpan={5}>Actual Subtotal</td>
                    <td>{formatPrice(actualSubtotal)}</td>
                  </tr>
                  <tr className="approvalDiscountRow">
                    <td colSpan={5}>Total Discount</td>
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
              <tr className="approvalGrandRow">
                <td colSpan={5}>Grand Total</td>
                <td>{formatPrice(grandTotal)}</td>
              </tr>
              {advanceAmount > 0 && (
                <tr>
                  <td colSpan={5}>Advance @ {advancePercent}%</td>
                  <td>{formatPrice(advanceAmount)}</td>
                </tr>
              )}
            </tfoot>
          </table>
        </section>

        <footer className="approvalQuoteFooter">
          <div>
            <span>For Adinn Advertising Services Limited</span>
            <strong>This preview is for internal approval review only.</strong>
          </div>
          <div>
            <span>Prepared By</span>
            <strong>{safeText(preparedBy.staffName || preparedBy.staff?.name)}</strong>
          </div>
        </footer>
      </article>

      <article className="approvalPdfLikePage approvalTermsPage">
        <header className="approvalMiniHeader">
          <img src={logoSrc} alt="ADINN" />
          <div>
            <strong>{quotationNumber}</strong>
            <span>Terms & Conditions</span>
          </div>
        </header>

        <section className="approvalTermsPanel">
          <div className="approvalTermsHeader">
            <div>
              <span>Roadshow Campaign</span>
              <h3>Terms & Conditions</h3>
            </div>
            <strong>Valid for {quote.validityDays || company.validityDays || 7} days</strong>
          </div>

          <ol className="approvalTermsList">
            {termsAndConditions.length ? (
              termsAndConditions.map((term, index) => (
                <li key={`${index}-${term}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{term}</p>
                </li>
              ))
            ) : (
              <li>
                <span>01</span>
                <p>No terms and conditions were saved with this quotation.</p>
              </li>
            )}
          </ol>
        </section>

        <section className="approvalInfoTwoCol">
          <div>
            <span>Payment Note</span>
            <ul>
              <li>Approval is required before staff can access the final PDF download/print flow.</li>
              <li>Any special discount should be validated by the approving admin.</li>
            </ul>
          </div>
          <div>
            <span>Approval Summary</span>
            <ul>
              <li>Branding discount: {formatPrice(pricingDetails.brandingCostDiscount || 0)}</li>
              <li>RTO discount: {formatPrice(pricingDetails.rtoPermissionDiscount || 0)}</li>
              <li>Total discount: {formatPrice(totalDiscountAmount)}</li>
            </ul>
          </div>
        </section>
      </article>
    </div>
  );
};

export default function RoadshowQuotationList() {
  const [items, setItems] = useState<RoadshowQuotationItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [approvalTarget, setApprovalTarget] =
    useState<RoadshowQuotationItem | null>(null);
  const [approvalPassword, setApprovalPassword] = useState("");
  const [approvalError, setApprovalError] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  const [previewTarget, setPreviewTarget] =
    useState<RoadshowQuotationItem | null>(null);
  const [previewQuotation, setPreviewQuotation] = useState<any | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const previewCloseButtonRef = useRef<HTMLButtonElement | null>(null);

  const pageNumbers = useMemo(() => {
    const totalPages = Math.max(pagination.totalPages || 1, 1);
    const currentPage = Math.max(page, 1);
    const startPage = Math.max(currentPage - 2, 1);
    const endPage = Math.min(startPage + 4, totalPages);

    return Array.from(
      {
        length: endPage - startPage + 1,
      },
      (_, index) => startPage + index,
    );
  }, [page, pagination.totalPages]);

  const fetchQuotations = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const params = new URLSearchParams();

      params.set("page", String(page));
      params.set("limit", String(limit));

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await fetch(
        `${ROADSHOW_QUOTATION_API_URL}?${params.toString()}`,
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to fetch quotations.");
      }

      setItems(result.data.items || []);
      setPagination(
        result.data.pagination || {
          page,
          limit,
          total: 0,
          totalPages: 1,
        },
      );
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to fetch quotations.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [page, limit, search]);

  useEffect(() => {
    if (!previewTarget) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = String(event.key || "").toLowerCase();

      if ((event.ctrlKey || event.metaKey) && ["p", "s"].includes(key)) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (key === "escape") {
        closeQuotationPreview();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    window.setTimeout(() => {
      previewCloseButtonRef.current?.focus();
    }, 0);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [previewTarget]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const handlePreviousPage = () => {
    setPage((currentPage) => Math.max(currentPage - 1, 1));
  };

  const handleNextPage = () => {
    setPage((currentPage) =>
      Math.min(currentPage + 1, pagination.totalPages || 1),
    );
  };

  const openApprovalPopup = (item: RoadshowQuotationItem) => {
    setApprovalTarget(item);
    setApprovalPassword("");
    setApprovalError("");
  };

  const closeApprovalPopup = () => {
    if (isApproving) return;

    setApprovalTarget(null);
    setApprovalPassword("");
    setApprovalError("");
  };

  const openQuotationPreview = async (item: RoadshowQuotationItem) => {
    const isWaitingForApproval = item.status === "waiting_for_approval";
    const pdfUrl = getPdfUrl(item);

    if (!isWaitingForApproval) {
      if (pdfUrl) {
        window.open(pdfUrl, "_blank", "noopener,noreferrer");
      }
      return;
    }

    try {
      setPreviewTarget(item);
      setPreviewQuotation(null);
      setPreviewError("");
      setIsLoadingPreview(true);

      const quotation = await fetchRoadshowQuotationById(item._id);
      setPreviewQuotation(quotation);
    } catch (error) {
      console.error(error);
      setPreviewError(
        error instanceof Error
          ? error.message
          : "Unable to load quotation preview.",
      );
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const closeQuotationPreview = () => {
    setPreviewTarget(null);
    setPreviewQuotation(null);
    setPreviewError("");
    setIsLoadingPreview(false);
  };

  const handleApproveSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!approvalTarget) return;

    try {
      setIsApproving(true);
      setApprovalError("");
      setSuccessMessage("");

      await approveRoadshowQuotation({
        quotationId: approvalTarget._id,
        password: approvalPassword,
      });

      setSuccessMessage("Quotation approved successfully.");
      setApprovalTarget(null);
      setApprovalPassword("");
      await fetchQuotations();
    } catch (error) {
      console.error(error);
      setApprovalError(
        error instanceof Error ? error.message : "Unable to approve quotation.",
      );
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="quotationListPage">
      <header className="quotationListHeader">
        <div>
          <p>ADINN Roadshow</p>
          <h1>Submitted Quotations</h1>
          <span>
            View submitted roadshow quotations and approve discount requests.
          </span>
        </div>

        <div className="quotationListHeaderActions">
          <Link to="/" className="secondaryBtn">
            Back Home
          </Link>

          <Link to="/roadshowQO" className="primaryBtn">
            Create Quotation
          </Link>
        </div>
      </header>

      <section className="quotationListCard">
        <div className="quotationToolbar">
          <form onSubmit={handleSearchSubmit} className="quotationSearchForm">
            <input
              type="text"
              value={searchInput}
              placeholder="Search quotation, company, client, staff..."
              onChange={(event) => setSearchInput(event.target.value)}
            />

            <button type="submit">Search</button>

            {search && (
              <button type="button" className="clearBtn" onClick={handleClearSearch}>
                Clear
              </button>
            )}
          </form>

          <div className="quotationLimitControl">
            <span>Rows</span>

            <select
              value={limit}
              onChange={(event) => {
                setPage(1);
                setLimit(Number(event.target.value));
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {errorMessage && <div className="quotationError">{errorMessage}</div>}
        {successMessage && (
          <div className="quotationSuccess">{successMessage}</div>
        )}

        <div className="quotationTableWrap">
          <table className="quotationListTable">
            <thead>
              <tr>
                <th>Created Date & Time</th>
                <th>Created Staff</th>
                <th>Company / Campaign</th>
                <th>Status</th>
                <th>Generated PDF</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="quotationEmptyCell">
                    Loading quotations...
                  </td>
                </tr>
              ) : items.length ? (
                items.map((item) => {
                  const pdfUrl = getPdfUrl(item);
                  const isWaitingForApproval =
                    item.status === "waiting_for_approval";
                  const canViewQuotation = Boolean(pdfUrl || isWaitingForApproval);

                  return (
                    <tr key={item._id}>
                      <td>
                        <div className="dateCell">
                          <strong>{formatDisplayDateTime(item.createdAt)}</strong>
                          <span>{item.quotationNumber || "-"}</span>
                        </div>
                      </td>

                      <td>
                        <strong>{getStaffDisplay(item)}</strong>
                      </td>

                      <td>
                        <div className="companyCell">
                          <strong>{getCompanyCampaignDisplay(item)}</strong>
                          <span>
                            {item.clientDetails?.clientName || "-"}
                            {item.clientDetails?.contactNumber
                              ? ` /+91 ${item.clientDetails.contactNumber}`
                              : ""}
                          </span>
                        </div>
                      </td>

                      <td>
                        {(() => {
                          const statusMeta = getStatusMeta(item.status);

                          return (
                            <span className={`quotationStatusBadge ${statusMeta.className}`}>
                              {statusMeta.label}
                            </span>
                          );
                        })()}
                      </td>

                      <td>
                        {canViewQuotation ? (
                          <button
                            type="button"
                            className="downloadLink quotationInlineLinkButton"
                            onClick={() => openQuotationPreview(item)}
                          >
                            View PDF
                          </button>
                        ) : (
                          <span className="notUploadedBadge">Not Uploaded</span>
                        )}
                      </td>

                      <td>
                        {item.status === "waiting_for_approval" ? (
                          <button
                            type="button"
                            className="approveBtn"
                            onClick={() => openApprovalPopup(item)}
                          >
                            Approve
                          </button>
                        ) : (
                          <span className="noActionText">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="quotationEmptyCell">
                    No quotations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="quotationPagination">
          <div>
            Showing page <strong>{pagination.page}</strong> of{" "}
            <strong>{pagination.totalPages || 1}</strong> — Total{" "}
            <strong>{pagination.total}</strong>
          </div>

          <div className="paginationButtons">
            <button
              type="button"
              onClick={handlePreviousPage}
              disabled={page <= 1 || isLoading}
            >
              Previous
            </button>

            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={pageNumber === page ? "active" : ""}
                onClick={() => setPage(pageNumber)}
                disabled={isLoading}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              onClick={handleNextPage}
              disabled={page >= (pagination.totalPages || 1) || isLoading}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {previewTarget && (
        <div
          className="approvalQuotePreviewBackdrop"
          role="dialog"
          aria-modal="true"
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="approvalQuotePreviewShell">
            <div className="approvalQuotePreviewTopbar">
              <div>
                <p>Protected PDF Preview</p>
                <h2>{previewTarget.quotationNumber}</h2>
                <span>
                  This is a quotation preview, not the downloadable PDF. Approval is required before download/print access.
                </span>
              </div>

              <button
                ref={previewCloseButtonRef}
                type="button"
                aria-label="Close quotation preview"
                onClick={closeQuotationPreview}
              >
                ×
              </button>
            </div>

            <div className="approvalQuotePreviewBody">
              {isLoadingPreview ? (
                <div className="approvalPreviewState">Loading quotation preview...</div>
              ) : previewError ? (
                <div className="approvalPreviewState error">{previewError}</div>
              ) : (
                <QuotationProtectedPreview quotation={previewQuotation || previewTarget} />
              )}
            </div>
          </div>
        </div>
      )}

      {approvalTarget && (
        <div className="approvalModalBackdrop" role="dialog" aria-modal="true">
          <form className="approvalModal" onSubmit={handleApproveSubmit}>
            <div className="approvalModalHeader">
              <div>
                <p>Admin Approval</p>
                <h2>{approvalTarget.quotationNumber}</h2>
              </div>

              <button type="button" onClick={closeApprovalPopup} disabled={isApproving}>
                ×
              </button>
            </div>

            <label>
              Approval Password
              <input
                type="password"
                value={approvalPassword}
                onChange={(event) => setApprovalPassword(event.target.value)}
                placeholder="Enter approval password"
                autoFocus
              />
            </label>

            {approvalError && <div className="approvalModalError">{approvalError}</div>}

            <div className="approvalModalActions">
              <button type="button" onClick={closeApprovalPopup} disabled={isApproving}>
                Cancel
              </button>
              <button type="submit" className="approveBtn" disabled={isApproving}>
                {isApproving ? "Approving..." : "Approve Quotation"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
