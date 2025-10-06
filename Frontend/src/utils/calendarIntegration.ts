interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: {
    name: string;
    address: string;
  };
  hasTickets?: boolean;
  price?: number;
}

export const addToCalendar = (event: Event, ticketCode?: string) => {
  const startDate = new Date(`${event.date}T${event.time}`);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration
  
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const eventDetails = {
    title: event.title,
    description: `${event.description}${ticketCode ? `\n\nTicket Code: ${ticketCode}` : ''}${event.hasTickets ? `\nPrice: $${event.price}` : ''}`,
    location: `${event.location?.name || 'TBD'}, ${event.location?.address || ''}`,
    startTime: formatDate(startDate),
    endTime: formatDate(endDate)
  };

  return {
    google: () => {
      const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventDetails.title)}&dates=${eventDetails.startTime}/${eventDetails.endTime}&details=${encodeURIComponent(eventDetails.description)}&location=${encodeURIComponent(eventDetails.location)}`;
      window.open(googleUrl, '_blank');
    },
    
    apple: () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Euforia//Event//EN
BEGIN:VEVENT
UID:${event._id}@euforia.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${eventDetails.startTime}
DTEND:${eventDetails.endTime}
SUMMARY:${eventDetails.title}
DESCRIPTION:${eventDetails.description.replace(/\n/g, '\\n')}
LOCATION:${eventDetails.location}
END:VEVENT
END:VCALENDAR`;
      
      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${event.title}.ics`;
      link.click();
      URL.revokeObjectURL(url);
    },
    
    outlook: () => {
      const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(eventDetails.title)}&startdt=${eventDetails.startTime}&enddt=${eventDetails.endTime}&body=${encodeURIComponent(eventDetails.description)}&location=${encodeURIComponent(eventDetails.location)}`;
      window.open(outlookUrl, '_blank');
    }
  };
};