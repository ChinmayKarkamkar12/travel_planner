import requests
import os
from src.agentic.logger import logging
from src.agentic.exception import CustomException
import sys


class SearchFlights:
    @classmethod
    def search_flights_tool(cls):
        """Returns the flight search function to be used as a tool by the agent."""
        return cls.search_flights

    @staticmethod
    def search_flights(origin: str, destination: str, date: str) -> str:
        """
        Search for flights using the Aviationstack API.

        Args:
            origin: Departure IATA airport code (e.g. 'BLR', 'DEL', 'JFK')
            destination: Destination IATA airport code (e.g. 'IXL' for Leh/Ladakh)
            date: Travel date (used for context only)

        Returns:
            Flight information as a formatted string.
        """
        try:
            logging.info(f"Searching flights from {origin} to {destination} on {date}.")
            api_key = os.getenv("AVIATIONSTACK_API_KEY")
            if not api_key:
                return "AVIATIONSTACK_API_KEY is not set. Cannot search flights."

            # Free tier only supports dep_iata + arr_iata without date filtering
            params = {
                "access_key": api_key,
                "dep_iata": origin.upper()[:3],
                "arr_iata": destination.upper()[:3],
                "limit": 5
            }

            response = requests.get("http://api.aviationstack.com/v1/flights", params=params, timeout=10)
            data = response.json()

            if "error" in data:
                err = data["error"]
                # Free plan doesn't support certain filters — return helpful message
                return (
                    f"Note: Live flight data unavailable ({err.get('message', 'API limitation')}).\n\n"
                    f"For flights from {origin} to {destination} around {date}, "
                    f"please check: MakeMyTrip, Yatra, or Cleartrip.\n"
                    f"Common airlines on this route: Air India, IndiGo, SpiceJet."
                )

            flights = data.get("data", [])
            if not flights:
                return (
                    f"No live flights found from {origin} to {destination}.\n"
                    f"For {date} travel, check MakeMyTrip or Google Flights.\n"
                    f"Leh (IXL) is the airport for Ladakh. Common airlines: Air India, IndiGo."
                )

            results = [f"Flights from {origin} to {destination} (around {date}):\n"]
            for i, flight in enumerate(flights[:3], 1):
                airline = flight.get("airline", {}).get("name", "Unknown Airline")
                flight_num = flight.get("flight", {}).get("iata", "N/A")
                dep_time = flight.get("departure", {}).get("scheduled", "N/A")
                arr_time = flight.get("arrival", {}).get("scheduled", "N/A")
                status = flight.get("flight_status", "scheduled")
                results.append(
                    f"{i}. {airline} - Flight {flight_num}\n"
                    f"   Departure: {dep_time}\n"
                    f"   Arrival: {arr_time}\n"
                    f"   Status: {status}\n"
                )

            logging.info("Flight search completed successfully.")
            return "\n".join(results)

        except Exception as e:
            logging.info(f"Failed to search flights: {str(e)}")
            raise CustomException(sys, e)
