import DayJS from "dayjs";
import DayJSAdvancedFormatting from "dayjs/plugin/advancedFormat";
import DayJSTimezone from "dayjs/plugin/timezone";
DayJS.extend(DayJSTimezone);
DayJS.extend(DayJSAdvancedFormatting);

export const FormatDateString = date => {
  if(!date) { return ""; }

  try {
    return DayJS(date).format("MMMM D, YYYY · h:mm A z");
  } catch (error) {
    // TODO: Central error reporting
    console.error(`Failed to parse date ${date}`);
    console.error(date);

    return "";
  }
};

export const FormatPriceString = (price, trimZeros=false) => {
  const currentLocale = (navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language;
  let formattedPrice = new Intl.NumberFormat(currentLocale || "en-US", { style: "currency", currency: price.currency }).format(parseFloat(price.amount));

  if(trimZeros && formattedPrice.endsWith(".00")) {
    formattedPrice = formattedPrice.slice(0, -3);
  }

  return formattedPrice;
};

export const ValidEmail = email => {
  return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    .test(email);
};

export const onEnterPressed = (fn) => {
  return (event) => {
    if(event.key && event.key.toLowerCase() !== "enter") {
      return;
    }

    fn(event);
  };
};

// Remove prefix from ntpId, if present
export const NonPrefixNTPId = (ntpId="") => {
  if(ntpId.includes(":")) {
    ntpId = ntpId.split(":")[1];
  }

  return ntpId;
};
