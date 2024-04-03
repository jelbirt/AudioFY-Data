/* @Author Jacob Elbirt
*	AudioFY Project created during 2023 Summer Aisiku Research Fellowship
*	Not intended for commercial use
*   Testing Class
*/

package test;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.util.Enumeration;
import java.util.Hashtable;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
 
 
 
public class planeCrashesTest {
	  private XSSFWorkbook workbook;
	  private XSSFSheet sheet;
      private String FILE_IN_NAME = "C:\\temp\\Airplane_Crashes_and_Fatalities_Since_1908.csv"; 
      private String FILE_OUT_NAME = "C:\\temp\\PlaneCrashes.xlsx";
      private String textDelimiter = ",";
      private Hashtable<Integer,Integer[]> agd = new Hashtable<Integer,Integer[]>(); //  Year, Stored Data[Record Count,Total Passengers,Total Deaths]
  
          public static void main(String[] args) {
                 new planeCrashesTest();
          }
         
          public planeCrashesTest() {
                 readFile();
          }
         
          public void readFile() {           // load the file
	            String line = "";
	            String[] split = null;
	            boolean headerRow = true;
	            try {
		               BufferedReader br = new BufferedReader(new FileReader(FILE_IN_NAME));
	                   while ((line = br.readLine()) != null) {
	                	   		split = parse(line);
	                	   		if (headerRow) {
	                        	  	headerRow = false;
	                	   		} else {			// NOT the Header row
									for(int i=0;i<split.length;i++) { 
										split[i] = split[i].trim(); 
									}
									
									if (split.length == 3) {
										if (!split[1].isEmpty() && !split[2].isEmpty()) {
											String[] date = split[0].split("/"); // [Month,Day,Year]
											Integer year = Integer.valueOf(date[2]);
											
											Integer[] data = new Integer[3];
											data[0] = 0; data[1] = 0; data[2] = 0;
											
											if(agd.containsKey(year)) {
													data = agd.get(year);
											}                   
											data[0] += 1; // add the new record count
											data[1] += Integer.valueOf(split[1]); // element 1 references # of people aboard column          --> adds value to cumulative
											data[2] += Integer.valueOf(split[2]); // element 2 references # of fatalities of people aboard   --> adds value to cumulative
											agd.put(year, data);				                        
										}
									}
	                          }			// END ELSE
	                   	 }
	                   	 br.close();
	             } catch (Exception e) {
	                   e.printStackTrace();
	             }
	              
	                
                // Output agd as delimited file for future use
                Enumeration<Integer> keys = agd.keys();
                String[] outputHeaders = {"Year", "Incident Count", "Total Passengers", "Deaths", "Death %"};
	            workbook = new XSSFWorkbook();
	     		sheet = workbook.createSheet("Plane Crashes");
	     		int rowNum=0;
	     		XSSFRow row;
	     		File file = new File(FILE_IN_NAME);
	     		row = sheet.createRow(rowNum);
                System.out.println("Year\tIncident Count\tTotal Passengers\tDeaths\tDeath %");
                while(keys.hasMoreElements()) {
	                Integer year = keys.nextElement();
	                Integer[] data = agd.get(year);
	                double dpct = 0.0;
	                if(data[1] > 0)
	                    dpct = (double)data[2] / (double)data[1];
	                	System.out.println(year + "\t" + data[0] + "\t" + data[1] + "\t" + data[2] + "\t" + dpct);
	                row = sheet.createRow(rowNum);
	                if (rowNum == 0) {
	                	int cellid = 0;
                	  	for (int i = 0; i < outputHeaders.length; ++i) {	// Reads in header row, formats with inverse colors
                	  			Cell cell = row.createCell(cellid++);
        			            Font font = cell.getSheet().getWorkbook().createFont();
        			            font.setColor(IndexedColors.WHITE.index);
        			            font.setBold(true);
        			            CellStyle cellSTL = cell.getSheet().getWorkbook().createCellStyle();
        			            cellSTL.setFont(font);
        			            cellSTL.setFillForegroundColor(IndexedColors.BLACK.index);
        			            cellSTL.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        			            
        			            cell.setCellStyle(cellSTL);
        		                cell.setCellValue(outputHeaders[i]);
                	  	}
	                } else {
		                row = sheet.createRow(rowNum);
	                    int cellid = 0;
	                    for (int i = 0; i < outputHeaders.length; ++i) {
	                    	if (i == 0) {						// Checks if entering the first column, if so enters the date year
	                    		Cell cell = row.createCell(cellid++);
	                    		cell.setCellValue(year);
	                    	} else if (i == (outputHeaders.length - 1)) {		// Checks if on the last column, containing aggregate data dpct
	                    		Cell cell = row.createCell(cellid++);
	                    		cell.setCellValue(dpct);
	                    	} else {							// If neither of the above cases, fill in the data
	                    		Cell cell = row.createCell(cellid++);
	                    		cell.setCellValue(data[i-1]);
	                    	}
	                    }
	                }
	                rowNum++;    
	            }
                writeExcelOutput(FILE_OUT_NAME);
                
	     }

         public void writeExcelOutput(String FILE_OUT_NAME) {
        	// Write Excel Output file
             try {
                 FileOutputStream outputStream = new FileOutputStream(FILE_OUT_NAME);
                 workbook.write(outputStream);	// these are what actually write the workbook

                 workbook.close();
             } catch (FileNotFoundException e) {
                 e.printStackTrace();
             } catch (IOException e) {
                 e.printStackTrace();
             }
         }
          
         public String[] parse(String line) {	// this will be the file line being used
            
              line = line.replaceAll("\r", ""); // remove EOL
              line = line.replaceAll("\n", ""); // remove EOL
              line = line.trim(); // remove empty space from ends
             
              String[] split = line.split(textDelimiter);
              return split;
         }
}

 