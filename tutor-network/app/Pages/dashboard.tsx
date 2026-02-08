"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "@supabase/supabase-js";

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

  const supabase = createClient();

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      
      if (!u) {
        router.replace("/Routes");
        return;
      }
      
      setUser(u);
      const type = u.user_metadata?.user_type as "student" | "tutor" | undefined;
      setUserType(type || null);
      setLoading(false);
      
      // Load data based on user type
      if (type === "student") {
        await loadTutors();
        await loadStudentEvents();
        await loadStudentAvailabilities();
      } else if (type === "tutor") {
        await loadStudents();
        await loadTutorEvents();
      }
    };
    
    loadUser();
  }, [router]);

  const loadTutors = async () => {
    if (!user) return;
    
    // Load tutors (users with user_type = 'tutor')
    // Note: This assumes you have a profiles table with user_type column
    // If not, you may need to query auth.users differently or create a profiles table
    const { data: tutorsData, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, email, contact_info")
      .eq("user_type", "tutor");
    
    if (error) {
      console.error("Error loading tutors:", error);
      // Fallback to placeholder if table doesn't exist yet
      setTutors([
        { id: "1", full_name: "John Tutor", email: "john@example.com", contact_info: "555-0101" },
        { id: "2", full_name: "Jane Tutor", email: "jane@example.com", contact_info: "555-0102" },
      ]);
      return;
    }
    
    setTutors(tutorsData || []);
  };

  const loadStudents = async () => {
    if (!user) return;
    
    // Load students (users with user_type = 'student')
    const { data: studentsData, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, email, contact_info")
      .eq("user_type", "student");
    
    if (error) {
      console.error("Error loading students:", error);
      // Fallback to placeholder if table doesn't exist yet
      setStudents([
        { id: "1", full_name: "Alice Student", email: "alice@example.com", contact_info: "555-0201" },
        { id: "2", full_name: "Bob Student", email: "bob@example.com", contact_info: "555-0202" },
      ]);
      return;
    }
    
    setStudents(studentsData || []);
  };

  const loadStudentEvents = async () => {
    if (!user) return;
    
    // Load bookings for the student
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        id,
        date,
        time,
        tutor_id,
        status,
        tutor:profiles!bookings_tutor_id_fkey(full_name)
      `)
      .eq("student_id", user.id)
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
    }));
    
    setEvents(formattedEvents);
  };

  const loadTutorEvents = async () => {
    if (!user) return;
    
    // Load bookings for the tutor
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        id,
        date,
        time,
        student_id,
        status,
        student:profiles!bookings_student_id_fkey(full_name)
      `)
      .eq("tutor_id", user.id)
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
    }));
    
    setEvents(formattedEvents);
    
    // Also load availabilities for the tutor
    const { data: availabilitiesData, error: availError } = await supabase
      .from("availabilities")
      .select("*")
      .eq("tutor_id", user.id)
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
    await loadTutorEvents();
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
    await loadStudentEvents();
    await loadStudentAvailabilities();
    alert(`Booking confirmed for ${availability.date} at ${timeSlot}`);
  };

  const loadStudentAvailabilities = async () => {
    if (!user || userType !== "student") return;
    
    // Load all availabilities from tutors (for students to see and book)
    const { data: availabilitiesData, error } = await supabase
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
                  const dayAvailabilities = day ? getAvailabilitiesForDate(day) : [];
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

          {/* Middle - Event Info / Availabilities */}
          <div className="col-span-4 bg-white rounded-lg border border-zinc-200 p-4 overflow-y-auto h-full flex flex-col min-h-0">
            <h2 className="text-lg font-semibold mb-3 flex-shrink-0">
              {userType === "student" ? "Available Sessions" : "Event Details"}
            </h2>
            
            {userType === "student" ? (
              // Student view: Show availabilities they can book
              <div className="flex-1 overflow-y-auto">
                {selectedDateEvents.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold mb-2">Your Bookings</h3>
                    <div className="space-y-2">
                      {selectedDateEvents.map((event) => (
                        <div
                          key={event.id}
                          className="p-2 border border-zinc-200 rounded-lg"
                        >
                          <p className="text-xs font-medium">{event.title}</p>
                          <p className="text-[10px] text-zinc-600">Time: {event.time}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedDateAvailabilities.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-zinc-500">
                      No available sessions for this day
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Available Time Slots</h3>
                    {selectedDateAvailabilities.map((availability: any) => (
                      <div
                        key={availability.id}
                        className="p-3 border border-zinc-200 rounded-lg"
                      >
                        <p className="text-xs font-medium mb-2">
                          {availability.tutor?.full_name || "Tutor"}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {availability.time_slots.map((slot: string) => (
                            <button
                              key={slot}
                              onClick={() => handleAcceptAvailability(availability.id, slot)}
                              className="px-3 py-1.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors"
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Tutor view: Show events and allow creating availability
              selectedDateEvents.length === 0 ? (
                <div className="text-center py-6 flex-1 flex flex-col justify-center">
                  <p className="text-sm text-zinc-500 mb-4">
                    No events scheduled for this day
                  </p>
                  {userType === "tutor" && (
                    <button
                      onClick={handleCreateAvailability}
                      className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors text-sm"
                    >
                      Create Availability
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-3 border border-zinc-200 rounded-lg"
                    >
                      <h3 className="font-semibold mb-1 text-sm">{event.title}</h3>
                      <p className="text-xs text-zinc-600">
                        Date: {new Date(event.date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-zinc-600">Time: {event.time}</p>
                    </div>
                  ))}
                  {userType === "tutor" && (
                    <button
                      onClick={handleCreateAvailability}
                      className="w-full px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors mt-3 text-sm"
                    >
                      Create Availability
                    </button>
                  )}
                </div>
              )
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
    </main>
  );
}
