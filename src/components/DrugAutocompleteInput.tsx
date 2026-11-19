"use client";

import React, { useState, useEffect, useRef } from "react";
import { checkDrugAllergyMatch } from "@/lib/utils";
import { AlertTriangle, Pill } from "lucide-react";

export interface DrugSuggestion {
  id: string;
  name: string;
  default_dose: string;
  default_frequency: string;
  drug_class: string;
}

interface DrugAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectDrug: (drug: DrugSuggestion) => void;
  allergies: Array<{ allergen: string; type?: string; severity?: string; reaction?: string }>;
  durationInputId?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

// In-memory client cache for instant filtering
let clientDrugCache: DrugSuggestion[] | null = null;

export function DrugAutocompleteInput({
  value,
  onChange,
  onSelectDrug,
  allergies,
  durationInputId,
  placeholder = "e.g. Amoxicillin, Paracetamol",
  className = "",
  autoFocus = false,
}: DrugAutocompleteInputProps) {
  const [allDrugs, setAllDrugs] = useState<DrugSuggestion[]>(clientDrugCache || []);
  const [suggestions, setSuggestions] = useState<DrugSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Fetch / load drugs master list once and cache
  useEffect(() => {
    if (clientDrugCache && clientDrugCache.length > 0) {
      setAllDrugs(clientDrugCache);
      return;
    }

    async function loadMasterList() {
      try {
        const res = await fetch("/api/drugs");
        const data = await res.json();
        if (data.success && Array.isArray(data.drugs)) {
          clientDrugCache = data.drugs;
          setAllDrugs(data.drugs);
        }
      } catch (err) {
        console.error("Failed to load drug suggestions:", err);
      }
    }

    loadMasterList();
  }, []);

  // Filter suggestions with debouncing & ranking (Prefix first, then Contains)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!value || value.trim().length < 1) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      const q = value.trim().toLowerCase();
      const prefixList: DrugSuggestion[] = [];
      const containsList: DrugSuggestion[] = [];

      for (const d of allDrugs) {
        const dLower = d.name.toLowerCase();
        if (dLower.startsWith(q)) {
          prefixList.push(d);
        } else if (dLower.includes(q)) {
          containsList.push(d);
        }
      }

      // Sort alphabetically within buckets
      prefixList.sort((a, b) => a.name.localeCompare(b.name));
      containsList.sort((a, b) => a.name.localeCompare(b.name));

      const ranked = [...prefixList, ...containsList].slice(0, 8);
      setSuggestions(ranked);
      setIsOpen(ranked.length > 0);
      setHighlightedIndex(-1);
    }, 150);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [value, allDrugs]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (drug: DrugSuggestion) => {
    onSelectDrug(drug);
    setIsOpen(false);
    setHighlightedIndex(-1);

    // Automatically advance focus to duration input if specified
    if (durationInputId) {
      setTimeout(() => {
        const nextElem = document.getElementById(durationInputId);
        if (nextElem) {
          nextElem.focus();
        }
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < suggestions.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const listboxId = "drug-autocomplete-listbox";

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-activedescendant={
          highlightedIndex >= 0 ? `drug-option-${highlightedIndex}` : undefined
        }
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (value.trim().length >= 1 && suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        className={className}
      />

      {/* Autocomplete Dropdown Listbox */}
      {isOpen && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in duration-150"
        >
          {suggestions.map((drug, idx) => {
            const isHighlighted = idx === highlightedIndex;

            // Check allergy conflict for this suggestion (both name match and class cross-allergy)
            const conflict = checkDrugAllergyMatch(drug.name, allergies, drug.drug_class);

            return (
              <li
                key={drug.id || drug.name + idx}
                id={`drug-option-${idx}`}
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => handleSelect(drug)}
                className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors text-xs sm:text-sm ${
                  isHighlighted
                    ? "bg-teal-50 dark:bg-teal-950/80 text-teal-900 dark:text-teal-100"
                    : "text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                      {drug.name}
                    </span>
                    {drug.default_dose && (
                      <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">
                        ({drug.default_dose})
                      </span>
                    )}
                  </div>

                  {conflict.hasWarning && (
                    <div className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{conflict.warningMessage || "Allergy conflict"}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {conflict.hasWarning && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider shadow-sm">
                      Allergy
                    </span>
                  )}
                  {drug.default_frequency && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-slate-500">
                      {drug.default_frequency}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
