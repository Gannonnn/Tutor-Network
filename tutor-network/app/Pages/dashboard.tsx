"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "@supabase/supabase-js";
import BookingModal from "@/app/components/BookingModal";
import AvailabilityModal from "@/app/components/AvailabilityModal";
import ConfirmModal from "@/app/components/ConfirmModal";

type Availability = {
  id: string;
  tutor_id: string;
  date: string;
  time_slots: string[]; // Array of time slots like ["10:00 AM", "2:00 PM"]
  created_at: string;
  tutor?: {
    full_name: string;
    avatar_url?: string;
    email?: string;
  };
  slotsWithStatus?: Array<{ time: string; booked: boolean }>; // Optional: booking status for each slot
};

type Booking = {
  id: string;
  availability_id: string;
  tutor_id: string;
  student_id: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
};

type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  tutor_id?: string;
  student_id?: string;
  booking_id?: string;
  subject_slug?: string | null;
  subtopic_title?: string | null;
  other_name?: string; // tutor name for student, student name for tutor
};

type Tutor = {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
  contact_info?: string;
};

type Student = {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
  contact_info?: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userType, setUserType] = useState<"student" | "tutor" | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [bookingModalTutor, setBookingModalTutor] = useState<Tutor | null>(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    variant?: "danger" | "default";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const supabase = createClient();

  useEffect(() => {
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
    
    return () => {
      // Restore body scrolling when component unmounts
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      
      if (!u) {
        router.replace("/login");
        return;
      }
      
      setUser(u);
      const type = u.user_metadata?.user_type as "student" | "tutor" | undefined;
      setUserType(type || null);
      
      // Load data based on user type (pass u so we don't rely on state)
      if (type === "student") {
        await loadCurrentTutorsForStudent(supabase, u.id);
        await loadStudentEvents(supabase, u.id);
      } else if (type === "tutor") {
        await loadCurrentStudentsForTutor(supabase, u.id);
        await loadTutorEvents(supabase, u.id);
      }
      setLoading(false);
    };
    
    loadUser();
  }, [router]);

  const loadCurrentTutorsForStudent = async (
    supabaseClient: ReturnType<typeof createClient>,
    studentId: string
  ) => {
    const { data: bookings } = await supabaseClient
      .from("bookings")
      .select("tutor_id")
      .eq("student_id", studentId)
      .eq("status", "confirmed");
    const tutorIds = [...new Set((bookings || []).map((b: { tutor_id: string }) => b.tutor_id))];
    if (tutorIds.length === 0) {
      setTutors([]);
      return;
    }
    const { data: tutorsData, error } = await supabaseClient
      .from("profiles")
      .select("id, full_name, avatar_url, email, contact_info")
      .in("id", tutorIds);
    if (error) {
      console.error("Error loading tutors:", error);
      setTutors([]);
      return;
    }
    setTutors(tutorsData || []);
  };

  const loadCurrentStudentsForTutor = async (
    supabaseClient: ReturnType<typeof createClient>,
    tutorId: string
  ) => {
    const { data: bookings } = await supabaseClient
      .from("bookings")
      .select("student_id")
      .eq("tutor_id", tutorId)
      .eq("status", "confirmed");
    const studentIds = [...new Set((bookings || []).map((b: { student_id: string }) => b.student_id))];
    if (studentIds.length === 0) {
      setStudents([]);
      return;
    }
    const { data: studentsData, error } = await supabaseClient
      .from("profiles")
      .select("id, full_name, avatar_url, email, contact_info")
      .in("id", studentIds);
    if (error) {
      console.error("Error loading students:", error);
      setStudents([]);
      return;
    }
    setStudents(studentsData || []);
  };

  const loadStudentEvents = async (
    supabaseClient: ReturnType<typeof createClient>,
    studentId: string
  ) => {
    const { data: bookings, error } = await supabaseClient
      .from("bookings")
      .select(`
        id,
        date,
        time,
        tutor_id,
        status,
        subject_slug,
        subtopic_title,
        tutor:profiles!bookings_tutor_id_fkey(full_name)
      `)
      .eq("student_id", studentId)
      .eq("status", "confirmed")
      .order("date", { ascending: true })
      .order("time", { ascending: true });
    
    if (error) {
      console.error("Error loading student events:", error);
      return;
    }
    
    const formattedEvents: Event[] = (bookings || []).map((booking: any) => ({
      id: booking.id,
      title: `Session with ${booking.tutor?.full_name || "Tutor"}`,
      date: booking.date,
      time: booking.time,
      tutor_id: booking.tutor_id,
      booking_id: booking.id,
      subject_slug: booking.subject_slug ?? null,
      subtopic_title: booking.subtopic_title ?? null,
      other_name: booking.tutor?.full_name ?? undefined,
    }));
    
    setEvents(formattedEvents);
  };

  const loadTutorEvents = async (
    supabaseClient: ReturnType<typeof createClient>,
    tutorId: string
  ) => {
    const { data: bookings, error } = await supabaseClient
      .from("bookings")
      .select(`
        id,
        date,
        time,
        student_id,
        status,
        subject_slug,
        subtopic_title,
        student:profiles!bookings_student_id_fkey(full_name)
      `)
      .eq("tutor_id", tutorId)
      .eq("status", "confirmed")
      .order("date", { ascending: true })
      .order("time", { ascending: true });
    
    if (error) {
      console.error("Error loading tutor events:", error);
      return;
    }
    
    const formattedEvents: Event[] = (bookings || []).map((booking: any) => ({
      id: booking.id,
      title: `Session with ${booking.student?.full_name || "Student"}`,
      date: booking.date,
      time: booking.time,
      student_id: booking.student_id,
      booking_id: booking.id,
      subject_slug: booking.subject_slug ?? null,
      subtopic_title: booking.subtopic_title ?? null,
      other_name: booking.student?.full_name ?? undefined,
    }));
    
    setEvents(formattedEvents);
    
    // Load ALL availabilities (including booked slots) for tutor's own view
    const { data: availabilitiesData, error: availError } = await supabaseClient
      .from("availabilities")
      .select("*")
      .eq("tutor_id", tutorId)
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date", { ascending: true });
    
    if (!availError && availabilitiesData) {
      // Get all confirmed bookings to mark which slots are booked
      const { data: tutorBookings } = await supabaseClient
        .from("bookings")
        .select("date, time")
        .eq("tutor_id", tutorId)
        .eq("status", "confirmed");
      
      // Create a map of booked slots: key = "date:time", value = true
      const bookedSlotsMap = new Map<string, boolean>();
      (tutorBookings || []).forEach((booking: any) => {
        const key = `${booking.date}:${booking.time}`;
        bookedSlotsMap.set(key, true);
      });
      
      // Keep all availabilities with all slots (for tutor's own view)
      // Don't filter - show all slots so tutor can see what they set
      setAvailabilities(availabilitiesData);
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dateStr = date.toISOString().split("T")[0];
    const dayEvents = events.filter((e) => e.date === dateStr);
    // Show events for that day
  };

  const handleCreateAvailabilityClick = () => {
    setShowAvailabilityModal(true);
  };

  const handleDeleteAvailability = (availabilityId: string) => {
    if (!user || userType !== "tutor") return;
    
    setConfirmModal({
      isOpen: true,
      title: "Delete Availability",
      message: "Are you sure you want to delete this availability? This will cancel any pending bookings for these time slots.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        
        const { error } = await supabase
          .from("availabilities")
          .delete()
          .eq("id", availabilityId)
          .eq("tutor_id", user.id);

        if (error) {
          alert(`Error deleting availability: ${error.message}`);
          return;
        }

        // Reload availabilities
        if (user) {
          await loadTutorEvents(supabase, user.id);
        }
        
        alert("Availability deleted successfully.");
      },
    });
  };

  const handleDeleteTimeSlot = (availabilityId: string, timeSlot: string, isBooked: boolean) => {
    if (!user || userType !== "tutor") return;

    if (isBooked) {
      alert("Cannot delete a time slot that is already booked. Please cancel the booking first.");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Remove Time Slot",
      message: `Are you sure you want to remove ${timeSlot} from your availability?`,
      confirmText: "Remove",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        
        // Get current availability
        const { data: availability, error: fetchError } = await supabase
          .from("availabilities")
          .select("time_slots")
          .eq("id", availabilityId)
          .eq("tutor_id", user.id)
          .single();

        if (fetchError || !availability) {
          alert("Error loading availability. Please try again.");
          return;
        }

        // Remove the time slot and sort remaining slots
        const updatedSlots = sortTimeSlots(
          availability.time_slots.filter((slot: string) => slot !== timeSlot)
        );

        // If no slots left, delete the availability, otherwise update it
        if (updatedSlots.length === 0) {
          const { error: deleteError } = await supabase
            .from("availabilities")
            .delete()
            .eq("id", availabilityId)
            .eq("tutor_id", user.id);

          if (deleteError) {
            alert(`Error deleting availability: ${deleteError.message}`);
            return;
          }
        } else {
          const { error: updateError } = await supabase
            .from("availabilities")
            .update({ time_slots: updatedSlots })
            .eq("id", availabilityId)
            .eq("tutor_id", user.id);

          if (updateError) {
            alert(`Error updating availability: ${updateError.message}`);
            return;
          }
        }

        // Reload availabilities
        if (user) {
          await loadTutorEvents(supabase, user.id);
        }
      },
    });
  };

  const handleCreateAvailability = async (selectedSlots: string[]) => {
    if (!user || userType !== "tutor") return;
    
    const dateStr = selectedDate.toISOString().split("T")[0];
    
    // Sort the selected slots chronologically
    const sortedSlots = sortTimeSlots(selectedSlots);
    
    // Check if availability already exists for this date
    const { data: existing } = await supabase
      .from("availabilities")
      .select("id, time_slots")
      .eq("tutor_id", user.id)
      .eq("date", dateStr)
      .maybeSingle();
    
    if (existing) {
      // Merge with existing time slots, avoiding duplicates, then sort
      const existingSlots = existing.time_slots || [];
      const mergedSlots = sortTimeSlots([...new Set([...existingSlots, ...sortedSlots])]);
      
      const { error } = await supabase
        .from("availabilities")
        .update({ time_slots: mergedSlots })
        .eq("id", existing.id);
      
      if (error) {
        alert(`Error updating availability: ${error.message}`);
        return;
      }
      
      alert(`Availability updated for ${formatDateString(dateStr)}`);
    } else {
      // Create new availability with sorted slots
      const { error } = await supabase
        .from("availabilities")
        .insert({
          tutor_id: user.id,
          date: dateStr,
          time_slots: sortedSlots,
        });
      
      if (error) {
        alert(`Error creating availability: ${error.message}`);
        return;
      }
      
      alert(`Availability created for ${formatDateString(dateStr)}`);
    }
    
    // Reload availabilities and events
    if (user) await loadTutorEvents(supabase, user.id);
    setShowAvailabilityModal(false);
  };

  const handleAcceptAvailability = async (availabilityId: string, timeSlot: string) => {
    if (!user || userType !== "student") return;
    
    // Get the availability to find the tutor_id
    const { data: availability, error: availError } = await supabase
      .from("availabilities")
      .select("tutor_id, date, time_slots")
      .eq("id", availabilityId)
      .single();
    
    if (availError || !availability) {
      alert("Error loading availability. Please try again.");
      return;
    }

    // Check if the time slot is still available
    if (!availability.time_slots.includes(timeSlot)) {
      alert("This time slot is no longer available. Please select another time.");
      await loadStudentAvailabilities(supabase, user.id);
      return;
    }
    
    // Check if a booking already exists for this tutor, date, and time
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id")
      .eq("tutor_id", availability.tutor_id)
      .eq("date", availability.date)
      .eq("time", timeSlot)
      .eq("status", "confirmed")
      .maybeSingle();
    
    if (existingBooking) {
      alert("This time slot is already booked. Please select another time.");
      await loadStudentAvailabilities(supabase, user.id);
      return;
    }
    
    // Create a booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        availability_id: availabilityId,
        tutor_id: availability.tutor_id,
        student_id: user.id,
        date: availability.date,
        time: timeSlot,
        status: "confirmed",
        subject_slug: null,
        subtopic_title: null,
      })
      .select()
      .single();
    
    if (bookingError) {
      alert(`Error creating booking: ${bookingError.message}`);
      return;
    }
    
    // Remove the time slot from availability
    const { data: updatedAvailability } = await supabase
      .from("availabilities")
      .select("time_slots")
      .eq("id", availabilityId)
      .single();
    
    if (updatedAvailability) {
      const updatedSlots = updatedAvailability.time_slots.filter(
        (slot: string) => slot !== timeSlot
      );
      
      // If no slots left, delete the availability, otherwise update it
      if (updatedSlots.length === 0) {
        await supabase
          .from("availabilities")
          .delete()
          .eq("id", availabilityId);
      } else {
        await supabase
          .from("availabilities")
          .update({ time_slots: updatedSlots })
          .eq("id", availabilityId);
      }
    }
    
    // Reload events for both student and tutor
    if (user) {
      await loadStudentEvents(supabase, user.id);
      await loadStudentAvailabilities(supabase, user.id);
    }
    alert(`Booking confirmed for ${availability.date} at ${timeSlot}`);
  };

  const loadStudentAvailabilities = async (
    supabaseClient: ReturnType<typeof createClient>,
    _studentId: string
  ) => {
    const { data: availabilitiesData, error } = await supabaseClient
      .from("availabilities")
      .select(`
        id,
        tutor_id,
        date,
        time_slots,
        created_at,
        tutor:profiles!availabilities_tutor_id_fkey(full_name, avatar_url, email)
      `)
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date", { ascending: true });
    
    if (error) {
      console.error("Error loading availabilities:", error);
      return;
    }

    // Get all confirmed bookings to filter out booked slots
    const { data: bookingsData } = await supabaseClient
      .from("bookings")
      .select("availability_id, date, time, tutor_id")
      .eq("status", "confirmed");
    
    // Create a map of booked slots: key = "tutor_id:date:time", value = true
    const bookedSlotsMap = new Map<string, boolean>();
    (bookingsData || []).forEach((booking: any) => {
      const key = `${booking.tutor_id}:${booking.date}:${booking.time}`;
      bookedSlotsMap.set(key, true);
    });
    
    // Transform the data and filter out booked slots
    const formattedAvailabilities: Availability[] = (availabilitiesData || []).map((avail: any) => {
      // Filter out time slots that are already booked
      const availableSlots = avail.time_slots.filter((slot: string) => {
        const key = `${avail.tutor_id}:${avail.date}:${slot}`;
        return !bookedSlotsMap.has(key);
      });
      
      return {
        id: avail.id,
        tutor_id: avail.tutor_id,
        date: avail.date,
        time_slots: availableSlots,
        created_at: avail.created_at,
        tutor: Array.isArray(avail.tutor) ? avail.tutor[0] : avail.tutor,
      };
    }).filter((avail: Availability) => avail.time_slots.length > 0); // Only include availabilities with available slots
    
    setAvailabilities(formattedAvailabilities);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split("T")[0];
    return events.filter((e) => e.date === dateStr);
  };

  const getAvailabilitiesForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split("T")[0];
    return availabilities.filter((a) => a.date === dateStr);
  };

  // Helper function to format date string without timezone conversion issues
  const formatDateString = (dateStr: string): string => {
    // Parse YYYY-MM-DD format directly without timezone conversion
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Helper function to sort time slots chronologically
  const sortTimeSlots = (slots: string[]): string[] => {
    return [...slots].sort((a, b) => {
      // Convert "9:00 AM" format to minutes since midnight for comparison
      const parseTime = (timeStr: string): number => {
        const [time, period] = timeStr.split(" ");
        const [hourStr, minuteStr] = time.split(":");
        let hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr || "0", 10);
        
        if (period === "PM" && hour !== 12) {
          hour += 12;
        } else if (period === "AM" && hour === 12) {
          hour = 0;
        }
        
        return hour * 60 + minute;
      };
      
      return parseTime(a) - parseTime(b);
    });
  };

  const handleDeleteMeeting = (event: Event) => {
    if (!user || !event.booking_id) {
      alert("Missing user or booking ID. Please try again.");
      return;
    }
    
    setConfirmModal({
      isOpen: true,
      title: "Cancel Meeting",
      message: `Are you sure you want to cancel this meeting on ${formatDateString(event.date)} at ${event.time}?`,
      confirmText: "Cancel Meeting",
      cancelText: "Keep Meeting",
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        
        await performDeleteMeeting(event);
      },
    });
  };

  const performDeleteMeeting = async (event: Event) => {
    if (!user || !event.booking_id) return;

    console.log("Deleting meeting:", { eventId: event.id, bookingId: event.booking_id, userId: user.id });

    // Get the booking to find availability_id
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("availability_id, date, time, tutor_id, student_id")
      .eq("id", event.booking_id)
      .single();

    if (bookingError || !booking) {
      console.error("Error loading booking:", bookingError);
      alert(`Error loading booking: ${bookingError?.message || "Booking not found"}. Please try again.`);
      return;
    }

    console.log("Found booking:", booking);

    // Verify user has permission to delete (must be tutor or student for this booking)
    if (booking.tutor_id !== user.id && booking.student_id !== user.id) {
      alert("You don't have permission to delete this booking.");
      return;
    }

    // Optimistically remove event from UI immediately
    setEvents((prevEvents) => {
      const filtered = prevEvents.filter((e) => e.id !== event.id && e.booking_id !== event.booking_id);
      console.log("Optimistic update - events before:", prevEvents.length, "after:", filtered.length);
      return filtered;
    });
    setSelectedEvent(null);

    // Delete the booking
    const { data: deleteData, error: deleteError } = await supabase
      .from("bookings")
      .delete()
      .eq("id", event.booking_id)
      .select();

    console.log("Delete result:", { deleteData, deleteError });

    if (deleteError) {
      console.error("Error deleting booking:", deleteError);
      // Reload events to restore the correct state
      if (user) {
        if (userType === "student") {
          await loadStudentEvents(supabase, user.id);
        } else if (userType === "tutor") {
          await loadTutorEvents(supabase, user.id);
        }
      }
      alert(`Error deleting booking: ${deleteError.message}. Please check your database permissions.`);
      return;
    }

    // Verify deletion succeeded
    if (!deleteData || deleteData.length === 0) {
      console.error("No rows deleted - booking may not exist or RLS policy blocked deletion");
      console.error("This usually means the DELETE policy is missing. Run this SQL in Supabase:");
      console.error(`
create policy "Tutor or student can delete own bookings"
  on public.bookings for delete
  using (auth.uid() = tutor_id or auth.uid() = student_id);
      `);
      // Reload events to restore the correct state
      if (user) {
        if (userType === "student") {
          await loadStudentEvents(supabase, user.id);
        } else if (userType === "tutor") {
          await loadTutorEvents(supabase, user.id);
        }
      }
      alert("Failed to delete booking. This is likely a database permissions issue. Please check the browser console for instructions on how to fix this.");
      return;
    }

    console.log("Booking deleted successfully, restoring availability slot");

    // Restore the time slot to availability if availability_id exists
    if (booking.availability_id) {
      const { data: availability, error: availError } = await supabase
        .from("availabilities")
        .select("id, time_slots")
        .eq("id", booking.availability_id)
        .single();

      if (!availError && availability) {
        // Add the time slot back if it's not already there
        if (!availability.time_slots.includes(booking.time)) {
          const updatedSlots = [...availability.time_slots, booking.time].sort();
          const { error: updateError } = await supabase
            .from("availabilities")
            .update({ time_slots: updatedSlots })
            .eq("id", booking.availability_id);
          
          if (updateError) {
            console.error("Error updating availability:", updateError);
          }
        }
      } else {
        // Availability doesn't exist, create it
        const { error: insertError } = await supabase
          .from("availabilities")
          .insert({
            tutor_id: booking.tutor_id,
            date: booking.date,
            time_slots: [booking.time],
          });
        
        if (insertError) {
          console.error("Error creating availability:", insertError);
        }
      }
    }

    // Reload events and availabilities to ensure consistency
    try {
      if (user) {
        if (userType === "student") {
          await loadStudentEvents(supabase, user.id);
          await loadStudentAvailabilities(supabase, user.id);
        } else if (userType === "tutor") {
          await loadTutorEvents(supabase, user.id);
        }
      }
      console.log("Events reloaded successfully");
    } catch (reloadError) {
      console.error("Error reloading events:", reloadError);
      // Don't show error to user since deletion succeeded
    }
    
    alert("Meeting cancelled successfully.");
  };

  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const currentMonth = selectedDate;
  const days = getDaysInMonth(currentMonth);
  const selectedDateEvents = getEventsForDate(selectedDate);
  const selectedDateAvailabilities = getAvailabilitiesForDate(selectedDate);

  return (
    <main className="fixed inset-0 bg-background overflow-hidden flex flex-col pt-14">
      <div className="flex-1 p-3 pt-2 overflow-hidden flex flex-col min-h-0">

        <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
          {/* Left Side - Calendar and Events */}
          <div className="col-span-4 flex flex-col gap-2 h-full min-h-0">
            {/* Calendar - Top 2/3 */}
            <div className="bg-white rounded-lg border border-zinc-200 p-3 flex-[2] overflow-hidden flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() =>
                    setSelectedDate(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() - 1
                      )
                    )
                  }
                  className="p-1 hover:bg-zinc-100 rounded text-sm"
                >
                  ←
                </button>
                <h2 className="text-base font-semibold">
                  {currentMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <button
                  onClick={() =>
                    setSelectedDate(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() + 1
                      )
                    )
                  }
                  className="p-1 hover:bg-zinc-100 rounded text-sm"
                >
                  →
                </button>
              </div>

              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div
                      key={day}
                      className="text-center text-[10px] font-medium text-zinc-500 py-0.5"
                    >
                      {day}
                    </div>
                  )
                )}
              </div>

              <div className="grid grid-cols-7 gap-0.5 flex-1">
                {days.map((day, idx) => {
                  const dayEvents = day ? getEventsForDate(day) : [];
                  const dayAvailabilities = userType === "tutor" && day ? getAvailabilitiesForDate(day) : [];
                  const isSelected =
                    day &&
                    day.toDateString() === selectedDate.toDateString();
                  const isToday =
                    day && day.toDateString() === new Date().toDateString();
                  const hasEvents = dayEvents.length > 0;
                  const hasAvailabilities = dayAvailabilities.length > 0;

                  return (
                    <button
                      key={idx}
                      onClick={() => day && handleDateClick(day)}
                      disabled={!day}
                      className={`
                        flex flex-col items-center justify-center text-xs rounded
                        ${!day ? "cursor-default" : "hover:bg-zinc-100 cursor-pointer"}
                        ${isSelected ? "bg-green-100 border border-green-700" : ""}
                        ${isToday && !isSelected ? "bg-blue-50" : ""}
                        ${hasEvents ? "font-semibold" : ""}
                      `}
                    >
                      {day ? day.getDate() : ""}
                      {(hasEvents || hasAvailabilities) && (
                        <div className={`w-1 h-1 rounded-full mt-0.5 ${
                          hasEvents ? "bg-green-600" : "bg-blue-400"
                        }`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Events List - Bottom 1/3 */}
            <div className="bg-white rounded-lg border border-zinc-200 p-3 flex-1 overflow-hidden flex flex-col min-h-0">
              <h3 className="font-semibold mb-2 text-sm flex-shrink-0">Upcoming Events</h3>
              {sortedEvents.length === 0 ? (
                <p className="text-xs text-zinc-500">No upcoming events</p>
              ) : (
                <div className="space-y-1.5 flex-1 overflow-y-auto min-h-0">
                  {sortedEvents.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="p-2 rounded hover:bg-zinc-50 cursor-pointer border border-zinc-100"
                    >
                      <p className="text-xs font-medium">{event.title}</p>
                      <p className="text-[10px] text-zinc-500">
                        {formatDateString(event.date)} at {event.time}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Middle - Event info (selected event) or prompt + Available Sessions */}
          <div className="col-span-4 bg-white rounded-lg border border-zinc-200 p-4 h-full flex flex-col min-h-0 overflow-hidden">
            <h2 className="text-lg font-semibold mb-3 flex-shrink-0">Event info</h2>

            {selectedEvent ? (
              <>
                <div className="p-3 border border-zinc-200 rounded-lg space-y-2 flex-1 min-h-0 overflow-y-auto">
                  <p className="text-sm font-medium">{selectedEvent.title}</p>
                  <p className="text-xs text-zinc-600">
                    With: {selectedEvent.other_name ?? (userType === "student" ? "Tutor" : "Student")}
                  </p>
                  <p className="text-xs text-zinc-600">
                    When: {formatDateString(selectedEvent.date)} at {selectedEvent.time}
                  </p>
                  {(selectedEvent.subtopic_title || selectedEvent.subject_slug) && (
                    <p className="text-xs text-zinc-600">
                      Topic: {selectedEvent.subtopic_title ?? selectedEvent.subject_slug ?? "—"}
                    </p>
                  )}
                  <div className="flex flex-col gap-2 mt-3">
                    <Link
                      href={`/session/${selectedEvent.booking_id ?? selectedEvent.id}`}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90"
                    >
                      Join session
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDeleteMeeting(selectedEvent)}
                      className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Cancel Meeting
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="mt-2 text-sm text-zinc-500 hover:underline flex-shrink-0"
                >
                  Back to calendar
                </button>
              </>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <p className="text-sm text-zinc-600 mb-3">
                  {userType === "student"
                    ? "Select an event from Upcoming Events (left) to see details and join the session. Book new sessions from a subject page or via Schedule new times with a current tutor."
                    : "Select an event from Upcoming Events (left) to see details and join, or use the calendar to create availability."}
                </p>
                {userType === "student" ? null : (
                <>
                  {/* Show availability for selected date */}
                  {selectedDateAvailabilities.length > 0 && (
                    <div className="mb-4 space-y-2">
                      <h3 className="text-sm font-semibold text-zinc-700">
                        My Availability for {formatDateString(selectedDate.toISOString().split("T")[0])}
                      </h3>
                      {selectedDateAvailabilities.map((avail) => {
                        // Get booked slots from bookings for this date
                        const dateStr = selectedDate.toISOString().split("T")[0];
                        const bookedSlotsSet = new Set(
                          events
                            .filter((e) => e.date === dateStr)
                            .map((e) => e.time)
                        );
                        
                        const allSlots = sortTimeSlots(avail.time_slots || []);
                        const bookedSlots = sortTimeSlots(allSlots.filter((slot) => bookedSlotsSet.has(slot)));
                        const availableSlots = sortTimeSlots(allSlots.filter((slot) => !bookedSlotsSet.has(slot)));
                        
                        return (
                          <div key={avail.id} className="p-3 border border-zinc-200 rounded-lg bg-zinc-50">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                {allSlots.length > 0 && (
                                  <>
                                    {availableSlots.length > 0 && (
                                      <div className="mb-2">
                                        <p className="text-xs font-medium text-zinc-600 mb-1">Available:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {availableSlots.map((slot: string) => (
                                            <span
                                              key={slot}
                                              className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs text-green-800"
                                            >
                                              {slot}
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteTimeSlot(avail.id, slot, false)}
                                                className="ml-1 flex items-center justify-center w-4 h-4 rounded-full hover:bg-red-300 hover:text-red-900 transition-colors text-red-700 font-bold text-sm leading-none"
                                                title={`Remove ${slot}`}
                                                aria-label={`Remove ${slot}`}
                                              >
                                                ×
                                              </button>
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {bookedSlots.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-zinc-600 mb-1">Booked:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {bookedSlots.map((slot: string) => (
                                            <span
                                              key={slot}
                                              className="inline-flex items-center rounded bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600"
                                            >
                                              {slot}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteAvailability(avail.id)}
                                className="ml-2 px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                title="Delete availability"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {selectedDateEvents.length === 0 && selectedDateAvailabilities.length === 0 ? (
                    <div className="text-center py-6 flex-1 flex flex-col justify-center">
                      <p className="text-sm text-zinc-500 mb-4">
                        No events scheduled for this day
                      </p>
                      <button
                        onClick={handleCreateAvailabilityClick}
                        className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors text-sm"
                      >
                        Create Availability
                      </button>
                    </div>
                  ) : selectedDateEvents.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-zinc-700">Scheduled Sessions</h3>
                      {selectedDateEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className="p-3 border border-zinc-200 rounded-lg cursor-pointer hover:bg-zinc-50"
                        >
                          <h3 className="font-semibold mb-1 text-sm">{event.title}</h3>
                          <p className="text-xs text-zinc-600">
                            Date: {formatDateString(event.date)}
                          </p>
                          <p className="text-xs text-zinc-600">Time: {event.time}</p>
                        </div>
                      ))}
                      <button
                        onClick={handleCreateAvailabilityClick}
                        className="w-full px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors mt-3 text-sm"
                      >
                        Create Availability
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleCreateAvailabilityClick}
                      className="w-full px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors text-sm"
                    >
                      Create Availability
                    </button>
                  )}
                </>
                )}
              </div>
            )}
          </div>

          {/* Right Side - Tutors or Students */}
          <div className="col-span-4 bg-white rounded-lg border border-zinc-200 p-4 h-full flex flex-col min-h-0 overflow-hidden">
            <h2 className="text-lg font-semibold mb-3 flex-shrink-0">
              {userType === "student" ? "Current Tutors" : "Current Students"}
            </h2>
            {userType === "student" ? (
              <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
                {tutors.length === 0 ? (
                  <p className="text-sm text-zinc-500">No tutors yet</p>
                ) : (
                  tutors.map((tutor) => (
                    <div
                      key={tutor.id}
                      className="w-full p-3 rounded-lg border border-zinc-200 flex items-start gap-3"
                    >
                      {tutor.avatar_url ? (
                        <img
                          src={tutor.avatar_url}
                          alt={tutor.full_name}
                          className="w-12 h-12 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium">
                            {tutor.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm mb-1">{tutor.full_name}</p>
                        {tutor.email && (
                          <p className="text-xs text-zinc-600 mb-0.5">{tutor.email}</p>
                        )}
                        {tutor.contact_info && (
                          <p className="text-xs text-zinc-600">{tutor.contact_info}</p>
                        )}
                        {user && (
                          <button
                            type="button"
                            onClick={() => setBookingModalTutor(tutor)}
                            className="mt-2 text-xs text-primary hover:underline font-medium"
                          >
                            Schedule new times
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
                {students.length === 0 ? (
                  <p className="text-sm text-zinc-500">No students yet</p>
                ) : (
                  students.map((student) => (
                    <div
                      key={student.id}
                      className="w-full p-3 rounded-lg border border-zinc-200 flex items-start gap-3"
                    >
                      {student.avatar_url ? (
                        <img
                          src={student.avatar_url}
                          alt={student.full_name}
                          className="w-12 h-12 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium">
                            {student.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm mb-1">{student.full_name}</p>
                        {student.email && (
                          <p className="text-xs text-zinc-600 mb-0.5">{student.email}</p>
                        )}
                        {student.contact_info && (
                          <p className="text-xs text-zinc-600">{student.contact_info}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {bookingModalTutor && user && (
        <BookingModal
          tutorId={bookingModalTutor.id}
          tutorName={bookingModalTutor.full_name}
          studentId={user.id}
          subjectSlug={null}
          subtopicTitle={null}
          onClose={() => setBookingModalTutor(null)}
          onSuccess={async () => {
            setBookingModalTutor(null);
            await loadCurrentTutorsForStudent(supabase, user.id);
            await loadStudentEvents(supabase, user.id);
          }}
        />
      )}

      {showAvailabilityModal && userType === "tutor" && user && (
        <AvailabilityModal
          date={selectedDate}
          tutorId={user.id}
          existingTimeSlots={
            getAvailabilitiesForDate(selectedDate)[0]?.time_slots || []
          }
          onClose={() => setShowAvailabilityModal(false)}
          onConfirm={handleCreateAvailability}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </main>
  );
}
