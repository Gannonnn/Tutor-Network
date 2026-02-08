"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Availability = {
  id: string;
  date: string;
  time_slots: string[];
};

type Props = {
  tutorId: string;
  tutorName: string;
  studentId: string;
  subjectSlug?: string | null;
  subtopicTitle?: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function BookingModal({
  tutorId,
  tutorName,
  studentId,
  subjectSlug,
  subtopicTitle,
  onClose,
  onSuccess,
}: Props) {
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  // Prevent tutors from booking with other tutors
  useEffect(() => {
    const checkUserType = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const userType = user.user_metadata?.user_type;
      if (userType === "tutor") {
        onClose();
        return;
      }
      
      // Also check profile if not in metadata
      if (!userType) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", user.id)
          .single();
        
        if (profile?.user_type === "tutor") {
          onClose();
          return;
        }
      }
    };
    checkUserType();
  }, [supabase, onClose]);

  useEffect(() => {
    const load = async () => {
      const { data, error: e } = await supabase
        .from("availabilities")
        .select("id, date, time_slots")
        .eq("tutor_id", tutorId)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true });
      if (e) {
        setError(e.message);
        setLoading(false);
        return;
      }

      // Get all confirmed bookings for this tutor to filter out booked slots
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("date, time")
        .eq("tutor_id", tutorId)
        .eq("status", "confirmed");
      
      // Create a map of booked slots: key = "date:time", value = true
      const bookedSlotsMap = new Map<string, boolean>();
      (bookingsData || []).forEach((booking: any) => {
        const key = `${booking.date}:${booking.time}`;
        bookedSlotsMap.set(key, true);
      });
      
      // Filter out booked slots from availabilities
      const filteredAvailabilities = (data || []).map((avail: any) => {
        const availableSlots = avail.time_slots.filter((slot: string) => {
          const key = `${avail.date}:${slot}`;
          return !bookedSlotsMap.has(key);
        });
        return {
          ...avail,
          time_slots: availableSlots,
        };
      }).filter((avail: any) => avail.time_slots.length > 0); // Only include availabilities with available slots
      
      setAvailabilities(filteredAvailabilities);
      setLoading(false);
    };
    load();
  }, [supabase, tutorId]);

  const selectedAvailability = selectedDate
    ? availabilities.find((a) => a.date === selectedDate)
    : null;
  const slots = selectedAvailability?.time_slots ?? [];

  const handleConfirm = async () => {
    if (!selectedDate || !selectedSlot || !selectedAvailability) return;
    setSubmitting(true);
    setError("");

    // Check if the time slot is still available
    if (!selectedAvailability.time_slots.includes(selectedSlot)) {
      setError("This time slot is no longer available. Please select another time.");
      setSubmitting(false);
      // Reload availabilities
      const { data, error: e } = await supabase
        .from("availabilities")
        .select("id, date, time_slots")
        .eq("tutor_id", tutorId)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true });
      if (!e && data) {
        const { data: bookingsData } = await supabase
          .from("bookings")
          .select("date, time")
          .eq("tutor_id", tutorId)
          .eq("status", "confirmed");
        const bookedSlotsMap = new Map<string, boolean>();
        (bookingsData || []).forEach((booking: any) => {
          const key = `${booking.date}:${booking.time}`;
          bookedSlotsMap.set(key, true);
        });
        const filteredAvailabilities = data.map((avail: any) => {
          const availableSlots = avail.time_slots.filter((slot: string) => {
            const key = `${avail.date}:${slot}`;
            return !bookedSlotsMap.has(key);
          });
          return { ...avail, time_slots: availableSlots };
        }).filter((avail: any) => avail.time_slots.length > 0);
        setAvailabilities(filteredAvailabilities);
      }
      return;
    }

    // Check if a booking already exists for this tutor, date, and time
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id")
      .eq("tutor_id", tutorId)
      .eq("date", selectedDate)
      .eq("time", selectedSlot)
      .eq("status", "confirmed")
      .maybeSingle();
    
    if (existingBooking) {
      setError("This time slot is already booked. Please select another time.");
      setSubmitting(false);
      // Reload availabilities
      const { data, error: e } = await supabase
        .from("availabilities")
        .select("id, date, time_slots")
        .eq("tutor_id", tutorId)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true });
      if (!e && data) {
        const { data: bookingsData } = await supabase
          .from("bookings")
          .select("date, time")
          .eq("tutor_id", tutorId)
          .eq("status", "confirmed");
        const bookedSlotsMap = new Map<string, boolean>();
        (bookingsData || []).forEach((booking: any) => {
          const key = `${booking.date}:${booking.time}`;
          bookedSlotsMap.set(key, true);
        });
        const filteredAvailabilities = data.map((avail: any) => {
          const availableSlots = avail.time_slots.filter((slot: string) => {
            const key = `${avail.date}:${slot}`;
            return !bookedSlotsMap.has(key);
          });
          return { ...avail, time_slots: availableSlots };
        }).filter((avail: any) => avail.time_slots.length > 0);
        setAvailabilities(filteredAvailabilities);
      }
      return;
    }

    const { error: insertError } = await supabase.from("bookings").insert({
      availability_id: selectedAvailability.id,
      tutor_id: tutorId,
      student_id: studentId,
      date: selectedDate,
      time: selectedSlot,
      status: "confirmed",
      subject_slug: subjectSlug || null,
      subtopic_title: subtopicTitle || null,
    });
    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }
    // Remove slot from availability
    const updatedSlots = selectedAvailability.time_slots.filter((s) => s !== selectedSlot);
    if (updatedSlots.length === 0) {
      await supabase.from("availabilities").delete().eq("id", selectedAvailability.id);
    } else {
      await supabase
        .from("availabilities")
        .update({ time_slots: updatedSlots })
        .eq("id", selectedAvailability.id);
    }
    setSubmitting(false);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl bg-white border border-zinc-200 shadow-xl">
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Schedule with {tutorName}</h3>
          <button
            type="button"
            className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-zinc-100"
            onClick={onClose}
            aria-label="Close"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-3">
          {loading && <p className="text-sm text-zinc-600">Loading availability…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && availabilities.length === 0 && (
            <p className="text-sm text-zinc-600">No availability for this tutor yet.</p>
          )}
          {!loading && availabilities.length > 0 && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Date</label>
                <select
                  value={selectedDate ?? ""}
                  onChange={(e) => {
                    setSelectedDate(e.target.value || null);
                    setSelectedSlot(null);
                  }}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                >
                  <option value="">Select date</option>
                  {availabilities.map((a) => {
                    // Parse YYYY-MM-DD format directly without timezone conversion
                    const [year, month, day] = a.date.split("-").map(Number);
                    const date = new Date(year, month - 1, day);
                    return (
                      <option key={a.id} value={a.date}>
                        {date.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </option>
                    );
                  })}
                </select>
              </div>
              {selectedDate && slots.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Time</label>
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`px-3 py-1.5 text-sm rounded border transition ${
                          selectedSlot === slot
                            ? "bg-primary text-white border-primary"
                            : "bg-zinc-50 border-zinc-200 hover:bg-zinc-100"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="p-4 border-t border-zinc-200 flex justify-end gap-2">
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
            disabled={!selectedSlot || submitting}
            className="px-3 py-2 rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50 text-sm"
          >
            {submitting ? "Booking…" : "Confirm appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}
