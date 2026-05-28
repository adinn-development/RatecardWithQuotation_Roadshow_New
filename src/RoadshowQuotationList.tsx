
/* eslint-disable */
// @ts-nocheck

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./RoadshowQuotationList.css";

const USE_LOCAL_API = false;   // set true for local, false for live
const API_BASE_URL = USE_LOCAL_API
  ? "http://localhost:3001"
  : "https://roadshow-backend.onrender.com";

const ROADSHOW_QUOTATION_API_URL = `${API_BASE_URL}/api/roadshow-quotations`;

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

const getStaffDisplay = (item: RoadshowQuotationItem) => {
  const staffName = item.preparedByDetails?.staffName || "-";
  const staffPhone = item.preparedByDetails?.staffPhone || "-";

  return `${staffName}/${staffPhone}`;
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

  return (
    <div className="quotationListPage">
      <header className="quotationListHeader">
        <div>
          <p>ADINN Roadshow</p>
          <h1>Submitted Quotations</h1>
          <span>
            View submitted roadshow quotations and download uploaded PDF files.
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

        <div className="quotationTableWrap">
          <table className="quotationListTable">
            <thead>
              <tr>
                <th>Created Date</th>
                <th>Created Staff</th>
                <th>Company / Campaign</th>
                <th>PDF Download Link</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="quotationEmptyCell">
                    Loading quotations...
                  </td>
                </tr>
              ) : items.length ? (
                items.map((item) => {
                  const pdfUrl = getPdfUrl(item);

                  return (
                    <tr key={item._id}>
                      <td>
                        <div className="dateCell">
                          <strong>{formatDisplayDate(item.createdAt)}</strong>
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
                              ? ` / ${item.clientDetails.contactNumber}`
                              : ""}
                          </span>
                        </div>
                      </td>

                      <td>
                        {pdfUrl ? (
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="downloadLink"
                          >
                            Download PDF
                          </a>
                        ) : (
                          <span className="notUploadedBadge">Not Uploaded</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="quotationEmptyCell">
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
    </div>
  );
}