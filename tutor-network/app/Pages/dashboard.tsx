"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "@supabase/supabase-js";
import BookingModal from "@/app/components/BookingModal";

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

  const supabase = createClient();

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
    
    // Also load availabilities for the tutor
    const { data: availabilitiesData, error: availError } = await supabaseClient
      .from("availabilities")
      .select("*")
      .eq("tutor_id", tutorId)
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date", { ascending: true });
    
    if (!availError && availabilitiesData) {
      setAvailabilities(availabilitiesData);
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dateStr = date.toISOString().split("T")[0];
    const dayEvents = events.filter((e) => e.date === dateStr);
    // Show events for that day
  };

  const handleCreateAvailability = async () => {
    if (!user || userType !== "tutor") return;
    
    const dateStr = selectedDate.toISOString().split("T")[0];
    
    // Check if availability already exists for this date
    const { data: existing } = await supabase
      .from("availabilities")
      .select("id")
      .eq("tutor_id", user.id)
      .eq("date", dateStr)
      .single();
    
    if (existing) {
      alert("Availability already exists for this date. Please select a different date.");
      return;
    }
    
    // Default time slots (can be customized later)
    const defaultTimeSlots = [
      "9:00 AM", "10:00 AM", "11:00 AM", 
      "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"
    ];
    
    const { data, error } = await supabase
      .from("availabilities")
      .insert({
        tutor_id: user.id,
        date: dateStr,
        time_slots: defaultTimeSlots,
      })
      .select()
      .single();
    
    if (error) {
      alert(`Error creating availability: ${error.message}`);
      return;
    }
    
    // Reload availabilities and events
    if (user) await loadTutorEvents(supabase, user.id);
    alert(`Availability created for ${selectedDate.toLocaleDateString()}`);
  };

  const handleAcceptAvailability = async (availabilityId: string, timeSlot: string) => {
    if (!user || userType !== "student") return;
    
    // Get the availability to find the tutor_id
    const { data: availability, error: availError } = await supabase
      .from("availabilities")
      .select("tutor_id, date")
      .eq("id", availabilityId)
      .single();
    
    if (availError || !availability) {
      alert("Error loading availability. Please try again.");
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
    
    // Transform the data to match Availability type
    const formattedAvailabilities: Availability[] = (availabilitiesData || []).map((avail: any) => ({
      id: avail.id,
      tutor_id: avail.tutor_id,
      date: avail.date,
      time_slots: avail.time_slots,
      created_at: avail.created_at,
      tutor: Array.isArray(avail.tutor) ? avail.tutor[0] : avail.tutor,
    }));
    
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
    <main className="h-screen bg-background overflow-hidden flex flex-col">
      <div className="flex-1 p-3 overflow-hidden flex flex-col">

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
            <div className="bg-white rounded-lg border border-zinc-200 p-3 flex-1 overflow-y-auto flex flex-col min-h-0">
              <h3 className="font-semibold mb-2 text-sm">Upcoming Events</h3>
              {sortedEvents.length === 0 ? (
                <p className="text-xs text-zinc-500">No upcoming events</p>
              ) : (
                <div className="space-y-1.5 flex-1 overflow-y-auto">
                  {sortedEvents.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="p-2 rounded hover:bg-zinc-50 cursor-pointer border border-zinc-100"
                    >
                      <p className="text-xs font-medium">{event.title}</p>
                      <p className="text-[10px] text-zinc-500">
                        {new Date(event.date).toLocaleDateString()} at {event.time}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Middle - Event info (selected event) or prompt + Available Sessions */}
          <div className="col-span-4 bg-white rounded-lg border border-zinc-200 p-4 overflow-y-auto h-full flex flex-col min-h-0">
            <h2 className="text-lg font-semibold mb-3 flex-shrink-0">Event info</h2>

            {selectedEvent ? (
              <>
                <div className="p-3 border border-zinc-200 rounded-lg space-y-2 flex-1">
                  <p className="text-sm font-medium">{selectedEvent.title}</p>
                  <p className="text-xs text-zinc-600">
                    With: {selectedEvent.other_name ?? (userType === "student" ? "Tutor" : "Student")}
                  </p>
                  <p className="text-xs text-zinc-600">
                    When: {new Date(selectedEvent.date).toLocaleDateString()} at {selectedEvent.time}
                  </p>
                  {(selectedEvent.subtopic_title || selectedEvent.subject_slug) && (
                    <p className="text-xs text-zinc-600">
                      Topic: {selectedEvent.subtopic_title ?? selectedEvent.subject_slug ?? "—"}
                    </p>
                  )}
                  <Link
                    href={`/session/${selectedEvent.booking_id ?? selectedEvent.id}`}
                    className="inline-flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90"
                  >
                    Join session
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="mt-2 text-sm text-zinc-500 hover:underline"
                >
                  Back to calendar
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-600 mb-3">
                  {userType === "student"
                    ? "Select an event from Upcoming Events (left) to see details and join the session. Book new sessions from a subject page or via Schedule new times with a current tutor."
                    : "Select an event from Upcoming Events (left) to see details and join, or use the calendar to create availability."}
                </p>
                {userType === "student" ? null : (
                <>
                  {selectedDateEvents.length === 0 ? (
                    <div className="text-center py-6 flex-1 flex flex-col justify-center">
                      <p className="text-sm text-zinc-500 mb-4">
                        No events scheduled for this day
                      </p>
                      <button
                        onClick={handleCreateAvailability}
                        className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors text-sm"
                      >
                        Create Availability
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {selectedDateEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className="p-3 border border-zinc-200 rounded-lg cursor-pointer hover:bg-zinc-50"
                        >
                          <h3 className="font-semibold mb-1 text-sm">{event.title}</h3>
                          <p className="text-xs text-zinc-600">
                            Date: {new Date(event.date).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-zinc-600">Time: {event.time}</p>
                        </div>
                      ))}
                      <button
                        onClick={handleCreateAvailability}
                        className="w-full px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors mt-3 text-sm"
                      >
                        Create Availability
                      </button>
                    </div>
                  )}
                </>
                )}
              </>
            )}
          </div>

          {/* Right Side - Tutors or Students */}
          <div className="col-span-4 bg-white rounded-lg border border-zinc-200 p-4 overflow-y-auto h-full flex flex-col min-h-0">
            <h2 className="text-lg font-semibold mb-3 flex-shrink-0">
              {userType === "student" ? "Current Tutors" : "Current Students"}
            </h2>
            {userType === "student" ? (
              <div className="space-y-3 flex-1 overflow-y-auto">
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
              <div className="space-y-3 flex-1 overflow-y-auto">
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
    </main>
  );
}
