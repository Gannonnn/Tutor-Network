"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  date: Date;
  tutorId: string;
  existingTimeSlots?: string[];
  onClose: () => void;
  onConfirm: (selectedSlots: string[]) => void;
};

// Generate time slots from 8 AM to 8 PM in 30-minute intervals
const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const displayMinute = minute === 0 ? "00" : minute.toString();
      slots.push(`${displayHour}:${displayMinute} ${period}`);
    }
  }
  return slots;
};

export default function AvailabilityModal({
  date,
  tutorId,
  existingTimeSlots = [],
  onClose,
  onConfirm,
}: Props) {
  const allTimeSlots = generateTimeSlots();
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(
    new Set(existingTimeSlots)
  );
  const [dbExistingSlots, setDbExistingSlots] = useState<string[]>(existingTimeSlots);
  const supabase = createClient();

  useEffect(() => {
    // Fetch actual availability from database to show all existing slots
    const loadExistingAvailability = async () => {
      const dateStr = date.toISOString().split("T")[0];
      const { data } = await supabase
        .from("availabilities")
        .select("time_slots")
        .eq("tutor_id", tutorId)
        .eq("date", dateStr)
        .maybeSingle();
      
      if (data?.time_slots) {
        setDbExistingSlots(data.time_slots);
        // Pre-select existing slots
        setSelectedSlots(new Set(data.time_slots));
      }
    };
    
    loadExistingAvailability();
  }, [date, tutorId, supabase]);

  const toggleSlot = (slot: string) => {
    const newSelected = new Set(selectedSlots);
    if (newSelected.has(slot)) {
      newSelected.delete(slot);
    } else {
      newSelected.add(slot);
    }
    setSelectedSlots(newSelected);
  };

  const handleConfirm = () => {
    if (selectedSlots.size === 0) {
      alert("Please select at least one time slot.");
      return;
    }
    onConfirm(Array.from(selectedSlots).sort());
  };

  const dateStr = date.toISOString().split("T")[0];
  const [year, month, day] = dateStr.split("-").map(Number);
  const displayDate = new Date(year, month - 1, day);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-white border border-zinc-200 shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-semibold">
            Create Availability for {displayDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h3>
          <button
            type="button"
            className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-zinc-100"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          <p className="text-sm text-zinc-600 mb-4">
            Select the time slots when you'll be available. You can select multiple slots.
          </p>
          {dbExistingSlots.length > 0 && (
            <p className="text-xs text-zinc-500 mb-3">
              Existing slots for this date: {dbExistingSlots.join(", ")}
            </p>
          )}
          <div className="grid grid-cols-4 gap-2">
            {allTimeSlots.map((slot) => {
              const isSelected = selectedSlots.has(slot);
              const isExisting = dbExistingSlots.includes(slot);
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => toggleSlot(slot)}
                  className={`px-3 py-2 text-sm rounded border transition ${
                    isSelected
                      ? "bg-primary text-white border-primary"
                      : "bg-zinc-50 border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
          {selectedSlots.size > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-1">
                Selected: {selectedSlots.size} time slot{selectedSlots.size !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-green-700">
                {Array.from(selectedSlots).sort().join(", ")}
              </p>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-zinc-200 flex justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-md border border-zinc-300 hover:bg-zinc-50 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedSlots.size === 0}
            className="px-3 py-2 rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50 text-sm"
          >
            Create Availability
          </button>
        </div>
      </div>
    </div>
  );
}
