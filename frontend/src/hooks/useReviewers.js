import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useCallback, useMemo, useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import Fuse from "fuse.js";
import { cacheManager } from "../utils/db";
import { toast } from "react-toastify";

// API functions
const fetchReviewers = async () => {
  // Try cache first
  const cached = await cacheManager.getCachedReviewers();
  if (cached) return cached;

  const res = await fetch(
    `${
      import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"
    }/api/admin/reviewer-links`
  );
  if (!res.ok) {
    const errorData = await res
      .json()
      .catch(() => ({ message: "Failed to fetch reviewer links" }));
    throw new Error(errorData.message || "Failed to fetch reviewer links");
  }

  const data = await res.json();
  const mapped = data.map((item) => ({
    id: item._id,
    title: item.title,
    type: item.fileType?.toLowerCase(),
    description: item.description,
    url: item.link,
    subject: item.subject,
    subjects: Array.isArray(item.subjects)
      ? item.subjects
      : item.subject
      ? [item.subject]
      : [],
    tags: item.tags || [],
    createdAt: item.createdAt,
    downloadCount: item.downloadCount || 0,
    fileSize: item.fileSize,
    lastModified: item.lastModified,
    difficulty: item.difficulty || "Medium",
    popularity: item.popularity || 0,
  }));

  // Cache the results
  await cacheManager.setCachedReviewers(mapped);
  return mapped;
};

const fetchFavorites = async (token) => {
  if (!token) {
    console.log("No token available for favorites");
    return [];
  }

  try {
    const res = await fetch(
      `${
        import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"
      }/api/students/favorite-reviewers`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      console.log(`Favorites API error: ${res.status} ${res.statusText}`);
      // Return empty array instead of throwing for 404 or auth errors
      if (res.status === 404 || res.status === 401 || res.status === 403) {
        return [];
      }
      throw new Error("Failed to fetch favorites");
    }

    const data = await res.json();
    return data.map((fav) => fav.reviewerLink?._id).filter(Boolean);
  } catch (error) {
    console.warn("Error fetching favorites:", error);
    return [];
  }
};

const toggleFavorite = async ({ id, token, isCurrentlyFavorite }) => {
  if (!token) {
    throw new Error("Authentication required");
  }

  const method = isCurrentlyFavorite ? "DELETE" : "POST";
  const url = isCurrentlyFavorite
    ? `${
        import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"
      }/api/students/favorite-reviewers/${id}`
    : `${
        import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"
      }/api/students/favorite-reviewers`;

  const body = isCurrentlyFavorite
    ? undefined
    : JSON.stringify({ reviewerLink: id });

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
        `Failed to ${isCurrentlyFavorite ? "unfavorite" : "favorite"}`
    );
  }

  return { id, favorited: !isCurrentlyFavorite };
};

const incrementDownload = async ({ id, token }) => {
  try {
    await fetch(
      `${
        import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"
      }/api/admin/reviewer-links/${id}/increment-download`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    // Don't throw for download tracking failures
    console.warn("Failed to track download:", error);
  }
  return id;
};

// Main hook for reviewers
export const useReviewers = () => {
  const queryClient = useQueryClient();
  const token = localStorage.getItem("token");

  const {
    data: reviewers = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["reviewers"],
    queryFn: fetchReviewers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    onError: (error) => {
      toast.error(`Failed to load reviewers: ${error.message}`);
    },
  });

  const { data: favorites = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ["favorites", token],
    queryFn: () => fetchFavorites(token),
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
    retry: 1, // Reduce retries for favorites
    onError: (error) => {
      console.warn("Favorites error (non-critical):", error);
      // Don't show toast for favorites errors
    },
  });

  // Mutations
  const favoriteMutation = useMutation({
    mutationFn: toggleFavorite,
    onMutate: async ({ id, isCurrentlyFavorite }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["favorites", token] });

      // Snapshot the previous value
      const previousFavorites =
        queryClient.getQueryData(["favorites", token]) || [];

      // Optimistically update
      const newFavorites = isCurrentlyFavorite
        ? previousFavorites.filter((favId) => favId !== id)
        : [...previousFavorites, id];

      queryClient.setQueryData(["favorites", token], newFavorites);

      return { previousFavorites };
    },
    onError: (err, variables, context) => {
      // Rollback
      if (context?.previousFavorites) {
        queryClient.setQueryData(
          ["favorites", token],
          context.previousFavorites
        );
      }
      toast.error(
        `Failed to ${
          variables.isCurrentlyFavorite ? "unfavorite" : "favorite"
        } item`
      );
    },
    onSuccess: (data) => {
      toast.success(
        data.favorited ? "Added to favorites!" : "Removed from favorites!"
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", token] });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: incrementDownload,
    onMutate: async ({ id }) => {
      // Optimistically update download count
      const previousReviewers = queryClient.getQueryData(["reviewers"]);
      const newReviewers = previousReviewers?.map((reviewer) =>
        reviewer.id === id
          ? { ...reviewer, downloadCount: (reviewer.downloadCount || 0) + 1 }
          : reviewer
      );
      queryClient.setQueryData(["reviewers"], newReviewers);
      return { previousReviewers };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousReviewers) {
        queryClient.setQueryData(["reviewers"], context.previousReviewers);
      }
    },
  });

  // Derived data
  const uniqueSubjects = useMemo(() => {
    const subjects = reviewers.flatMap((r) => r.subjects);
    return [...new Set(subjects)].sort();
  }, [reviewers]);

  const uniqueFileTypes = useMemo(() => {
    const types = reviewers.map((r) => r.type).filter(Boolean);
    return [...new Set(types)].sort();
  }, [reviewers]);

  return {
    reviewers,
    favorites,
    uniqueSubjects,
    uniqueFileTypes,
    isLoading: isLoading || favoritesLoading,
    error,
    refetch,
    toggleFavorite: useCallback(
      (id) => {
        if (!token) {
          toast.error("You must be logged in to manage favorites");
          return;
        }
        const isCurrentlyFavorite = favorites.includes(id);
        favoriteMutation.mutate({ id, token, isCurrentlyFavorite });
      },
      [favoriteMutation, favorites, token]
    ),
    handleAccess: useCallback(
      (id, url) => {
        if (!url) {
          toast.error("No URL available for this item");
          return;
        }
        downloadMutation.mutate({ id, token });
        window.open(url, "_blank");
      },
      [downloadMutation, token]
    ),
  };
};

// Advanced filtering and search hook
export const useAdvancedSearch = (
  reviewers,
  favorites,
  showFavoritesOnly = false
) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedFileTypes, setSelectedFileTypes] = useState([]);
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [sortBy, setSortBy] = useState("newest");
  const [searchHistory, setSearchHistory] = useState([]);

  // Initialize Fuse.js for fuzzy search
  const fuse = useMemo(
    () =>
      new Fuse(reviewers, {
        keys: [
          { name: "title", weight: 0.6 },
          { name: "description", weight: 0.3 },
          { name: "subjects", weight: 0.1 },
          { name: "tags", weight: 0.1 },
        ],
        threshold: 0.3,
        includeScore: true,
        includeMatches: true,
      }),
    [reviewers]
  );

  // Load search history
  useEffect(() => {
    const loadHistory = async () => {
      const history = await cacheManager.getSearchHistory();
      setSearchHistory(history.map((h) => h.query));
    };
    loadHistory();
  }, []);

  // Save search to history
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      cacheManager.addSearchHistory(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  const filteredReviewers = useMemo(() => {
    let result = showFavoritesOnly
      ? reviewers.filter((r) => favorites.includes(r.id))
      : reviewers;

    // Text search with fuzzy matching
    if (debouncedSearchTerm.trim()) {
      const searchResults = fuse.search(debouncedSearchTerm);
      const resultIds = new Set(searchResults.map((r) => r.item.id));
      result = result.filter((r) => resultIds.has(r.id));
    }

    // Subject filter
    if (selectedSubjects.length > 0) {
      result = result.filter((r) =>
        r.subjects.some((s) => selectedSubjects.includes(s))
      );
    }

    // File type filter
    if (selectedFileTypes.length > 0) {
      result = result.filter((r) => selectedFileTypes.includes(r.type));
    }

    // Difficulty filter
    if (difficultyFilter) {
      result = result.filter((r) => r.difficulty === difficultyFilter);
    }

    // Date range filter
    if (dateRange.start || dateRange.end) {
      result = result.filter((r) => {
        const date = new Date(r.createdAt);
        const start = dateRange.start ? new Date(dateRange.start) : new Date(0);
        const end = dateRange.end ? new Date(dateRange.end) : new Date();
        return date >= start && date <= end;
      });
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "oldest":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        case "popularity":
          return (b.downloadCount || 0) - (a.downloadCount || 0);
        case "difficulty": {
          const difficultyOrder = { Easy: 1, Medium: 2, Hard: 3 };
          return (
            (difficultyOrder[a.difficulty] || 2) -
            (difficultyOrder[b.difficulty] || 2)
          );
        }
        default:
          return 0;
      }
    });

    return result;
  }, [
    reviewers,
    favorites,
    showFavoritesOnly,
    debouncedSearchTerm,
    selectedSubjects,
    selectedFileTypes,
    difficultyFilter,
    dateRange,
    sortBy,
    fuse,
  ]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedSubjects([]);
    setSelectedFileTypes([]);
    setDifficultyFilter("");
    setDateRange({ start: null, end: null });
    setSortBy("newest");
  }, []);

  const addSubjectFilter = useCallback((subject) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  }, []);

  const addFileTypeFilter = useCallback((fileType) => {
    setSelectedFileTypes((prev) =>
      prev.includes(fileType)
        ? prev.filter((t) => t !== fileType)
        : [...prev, fileType]
    );
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    selectedSubjects,
    selectedFileTypes,
    difficultyFilter,
    setDifficultyFilter,
    dateRange,
    setDateRange,
    sortBy,
    setSortBy,
    searchHistory,
    filteredReviewers,
    clearFilters,
    addSubjectFilter,
    addFileTypeFilter,
    hasActiveFilters: !!(
      debouncedSearchTerm ||
      selectedSubjects.length ||
      selectedFileTypes.length ||
      difficultyFilter ||
      dateRange.start ||
      dateRange.end
    ),
  };
};

// Infinite scroll hook
export const useInfiniteReviewers = (filteredReviewers, pageSize = 12) => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["reviewers-infinite", filteredReviewers.length],
      queryFn: ({ pageParam = 0 }) => {
        const start = pageParam * pageSize;
        const end = start + pageSize;
        const items = filteredReviewers.slice(start, end);

        return {
          items,
          nextCursor:
            end < filteredReviewers.length ? pageParam + 1 : undefined,
        };
      },
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: filteredReviewers.length > 0,
    });

  const allItems = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) || [];
  }, [data]);

  return {
    items: allItems,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  };
};
