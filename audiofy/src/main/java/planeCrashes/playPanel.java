/* @Author Jacob Elbirt
*	AudioFY Project created during 2023 Summer Aisiku Research Fellowship
*	Not intended for commercial use
*/

package planeCrashes;

import javax.swing.JFrame;
import javax.swing.JPanel;
import java.awt.GridBagLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.GridBagConstraints;
import java.awt.Insets;
import java.awt.Point;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.MouseMotionListener;
import java.util.ArrayList;
import java.util.Hashtable;
import java.util.zip.DataFormatException;

import javax.swing.JScrollPane;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

public class playPanel extends JPanel implements MouseListener, MouseMotionListener {
	private static final long serialVersionUID = 1L;
	private GraphPanel GP = null;
	private Point initialClick;
	private JFrame PW = null;
	private int borderSize;
	private boolean resize = false;
	private Point mdLastPos = new Point();
	private Point oriPWSize = new Point();
	private int sizeGrowRate = 1;
	private int minSize = 50;
	private int axisOffset = 40;
	private AudioFY AF = null;
	private Configurations CONFIG = null;
	private playThread PT = null;
	private int OVAL_SIZE = 5;
	private int dataFormatIndex = 4;
	
	
	public playPanel(JFrame parentWindow, int bordersize, AudioFY af, Configurations config) {
		AF = af;
		borderSize = bordersize;
		PW = parentWindow;
		CONFIG = config;
		this.addMouseListener(this);
		this.addMouseMotionListener(this);
		
		GridBagLayout gridBagLayout = new GridBagLayout();
		gridBagLayout.columnWidths = new int[]{120};
		gridBagLayout.rowHeights = new int[]{0, 23, 0};
		gridBagLayout.columnWeights = new double[]{1.0};
		gridBagLayout.rowWeights = new double[]{1.0, 0.0, Double.MIN_VALUE};
		setLayout(gridBagLayout);
		
		JScrollPane scrollPane = new JScrollPane();
		GridBagConstraints gbc_scrollPane = new GridBagConstraints();
		gbc_scrollPane.fill = GridBagConstraints.BOTH;
		gbc_scrollPane.insets = new Insets(0, 0, 5, 0);
		gbc_scrollPane.gridx = 0;
		gbc_scrollPane.gridy = 0;
		add(scrollPane, gbc_scrollPane);
		
		GP = new GraphPanel(axisOffset, config, af);
		
		scrollPane.setViewportView(GP);
		//GP.setPreferredSize(new Dimension(480 + 2 * axisOffset,2100));
		GP.addMouseListener(this);
		GP.addMouseMotionListener(this);
		GP.setBackground(Color.WHITE);
		
		
		ToneButtonControlPanel panel = new ToneButtonControlPanel(this);
		panel.addMouseListener(this);
		panel.addMouseMotionListener(this);
		GridBagConstraints gbc_panel = new GridBagConstraints();
		gbc_panel.fill = GridBagConstraints.BOTH;
		gbc_panel.gridx = 0;
		gbc_panel.gridy = 1;
		add(panel, gbc_panel);
	}

	public void clearGraphIndex(int index, boolean remove_from_data) {
		GP.clearX(index, OVAL_SIZE, remove_from_data);
	}
	
	public void resetGraphWindowDefault() {
		CONFIG.setyAxisMin(GP.getyMinDefault());
		CONFIG.setyAxisMax(GP.getyMaxDefault());
		CONFIG.setGraphTitle(GP.getGraphTitle());
		CONFIG.setxAxisTitle(GP.getxAxisTitle());
		CONFIG.setyAxisTitle(GP.getyAxisTitle());
		GP.clearGraph(GP.getGraphics());
	}
	
	public void buttonAction(String buttonCommand) { 
		try {
			if(buttonCommand.equals("STOP")) {
				PT.setStop(true);
				PT.setRunning(false);
				if (PT.getCurrentIndex() != 0) {	// checks if any data was played
					AF.publishOutputs(CONFIG);
				}
				GP.clearGraph(GP.getGraphics());
				PT.setCurrentIndex(0);
				PT.executeIndex(false,0);
				if (CONFIG.isyAxisTicks()) {
					GP.paintTickLines(GP.getGraphics(), String.valueOf(CONFIG.getyTickIntIndex()), CONFIG.isyTickLabels());
				}
				GP.setNeedDataRepaint(false);
				if (CONFIG.isTDOutput()) {
					AF.getTDOutputWriter().close();
				}
			} else if(buttonCommand.equals("PLAY")) {	
				// Outputs
				if(CONFIG.isExcelOutput()) { 
					AF.setOutputWB(new XSSFWorkbook());
					AF.createXLOutputSHTS();
				}
				if(CONFIG.isTDOutput()) {
					AF.createTDOutputWriter();
					System.out.println("create td output writer ran");
				}
				if(CONFIG.isAudioOutput()) {
					AF.createAudioOutputStorage();
				}
				this.getGP().updateRepaintGP(PT, this.getGP().getGraphics(), AF);
				PT.setCurrentConfigurations(AF.create_configurations());
				PT.setCurrentDSSList(AF.getDSSList());
				PT.setGlobalMinMax(AF.getGlobalMinMax());
				PT.setRunning(true);
				GP.setNeedDataRepaint(true);

			} else if(buttonCommand.equals("REWIND")) {
				if(!PT.isRunning()) {
					PT.setCurrentConfigurations(AF.create_configurations());
					PT.setCurrentDSSList(AF.getDSSList());
					PT.setGlobalMinMax(AF.getGlobalMinMax());
					if(PT.getCurrentIndex() > 0) {
						PT.clearCurrentIndexGraph(true);
						PT.decrementCurrentIndex();
						PT.executeCurrentIndex(true);
					}
				}
			} else if(buttonCommand.equals("PAUSE")) {
				PT.setRunning(false);
			} else if(buttonCommand.equals("FAST FORWARD")) {
				if(!PT.isRunning()) {
					PT.setCurrentConfigurations(AF.create_configurations());
					PT.setCurrentDSSList(AF.getDSSList());
					PT.setGlobalMinMax(AF.getGlobalMinMax());
					PT.incrementCurrentIndex();
					try {
						PT.executeCurrentIndex(true);
					} catch(Exception e) {
						PT.decrementCurrentIndex();
						if(!e.getMessage().equals("")) {
							throw e;
						}
					}
				}
			} else if(buttonCommand.equals("PLAY TONE")) {
				if(!PT.isRunning()) {
					PT.setCurrentConfigurations(AF.create_configurations());
					PT.setCurrentDSSList(AF.getDSSList());
					PT.setGlobalMinMax(AF.getGlobalMinMax());
					try {
						PT.executeCurrentIndex(true);
					} catch(Exception e) {
						if(!e.getMessage().equals("")) {
							throw e;
						}
					}
				}
			}
		} catch (Exception e) {
			if(!e.getMessage().equals("")) {
				e.printStackTrace();
				AF.displayErrorMSG(new Exception("Unable to play note : " + e.getMessage()));
			}
		}
	}

	public void update_display_data(int timeIndex, Hashtable<String,double[]> data, ArrayList<dataSourceStructure> currentDSS, boolean save,
	Configurations currentConfigs) throws DataFormatException {
		// String is the name (sheetName+"-"+headerName) double[] = raw, normalized, log(), Hz
		ArrayList<Object[]> dData = new ArrayList<Object[]>(); // { Color, Point, Size }
		for(int i=0;i<currentDSS.size();i++) {
			dataSourceStructure dss = currentDSS.get(i);
			String fName = dss.getSheetName() + "-" + dss.getrORcName();
			if(!data.containsKey(fName)) {
				throw new DataFormatException("Could not find a data record for the dss getrORcName " + dss.getrORcName());
			}
			
			double[] d = data.get(fName);
			Object[] dd = new Object[3];
			dd[0] = dss.getMyColor();
			dd[1] = new Point(timeIndex,(int)d[dataFormatIndex]); 
			dd[2] = OVAL_SIZE;				
			
			dData.add(dd);
		}
		GP.setCONFIG(currentConfigs);
		GP.paintData(dData, save);
	}
	
	public void setWB(XSSFWorkbook wb) {
		PT.setWB(wb);
	}
	
	public void setPlayThread(playThread pt) {
		PT = pt;
	}
	
	public int getDataFormatIndex() {
		return dataFormatIndex;
	}

	public void setDataFormatIndex(int dataFormatIndex) {
		this.dataFormatIndex = dataFormatIndex;
	}

	public void mouseDragged(MouseEvent e) {
		Point mdCurrentPos = e.getPoint();
		boolean negX = false;
		boolean negY = false;
		
		if (mdLastPos.x - mdCurrentPos.x > 0) {
			negX = true;
		}
		if (mdLastPos.y - mdCurrentPos.y > 0) {
			negY = true;
		}
		                
		if(resize) {
			if (initialClick.getX() <= borderSize) {	// Left border				
				if (negX) {	// Grow X
					PW.setSize(new Dimension(PW.getWidth()+sizeGrowRate, PW.getHeight()));
					PW.setLocation(new Point(PW.getLocation().x-sizeGrowRate,PW.getLocation().y));
				} else {	// xMoved > 0 --> Shrink X
					if (PW.getWidth() - sizeGrowRate < minSize) {
						return;
					}
					PW.setSize(new Dimension(PW.getWidth()-sizeGrowRate, PW.getHeight()));
					PW.setLocation(new Point(PW.getLocation().x+sizeGrowRate,PW.getLocation().y));
				}
			} else if (initialClick.getY() <= borderSize) {	// Top border
				if(negY ) { // grow
					PW.setSize(new Dimension(PW.getWidth(), PW.getHeight()+sizeGrowRate));
					PW.setLocation(new Point(PW.getLocation().x,PW.getLocation().y-sizeGrowRate));
				} else { // shrink
					PW.setSize(new Dimension(PW.getWidth(), PW.getHeight()-sizeGrowRate));
					PW.setLocation(new Point(PW.getLocation().x,PW.getLocation().y+sizeGrowRate));
				}
			} else if (initialClick.getX() >= (oriPWSize.x - borderSize)) {	// Right border
				if (negX) {	// Shrink X
					if (PW.getWidth() - sizeGrowRate < minSize) {
						return;
					}
					PW.setSize(new Dimension(PW.getWidth()-sizeGrowRate, PW.getHeight()));
				} else {	// xMoved > 0 --> Grow X			752 + (752 
					PW.setSize(new Dimension(PW.getWidth()+sizeGrowRate, PW.getHeight()));
				}
			} else {	// y > height - borderSize --> Bottom border
				if(negY) { // shrink
					if (PW.getHeight() - sizeGrowRate < minSize) {
						return;
					}
					PW.setSize(new Dimension(PW.getWidth(), PW.getHeight()-sizeGrowRate));
				} else { // grow
					PW.setSize(new Dimension(PW.getWidth(), PW.getHeight()+sizeGrowRate));
				}
			}

			return;
		}
		
		// get location of Window
        int thisX = PW.getLocation().x;
        int thisY = PW.getLocation().y;
        
	    // Determine how much the mouse moved since the initial click
        int xMoved = e.getX() - initialClick.x;
        int yMoved = e.getY() - initialClick.y;
 
        // Move window to this position
        int X = thisX + xMoved;
        int Y = thisY + yMoved;
        PW.setLocation(X, Y);
	}

	public GraphPanel getGP() {
		return GP;
	}

	public void mouseMoved(MouseEvent e) {
	}

	public void mouseClicked(MouseEvent e) {
	}

	public void mousePressed(MouseEvent e) {
		initialClick = e.getPoint();
		mdLastPos = e.getPoint();
		oriPWSize.setLocation(PW.getWidth(),PW.getHeight());

		if (initialClick.getX() <= borderSize || initialClick.getY() <= borderSize || initialClick.getX() >= (oriPWSize.x - borderSize)
		|| initialClick.getY() >= (oriPWSize.y  - borderSize) /*|| fastResize*/) {
			resize = true;
		} else {
			resize = false;
		}
	}

	public void mouseReleased(MouseEvent e) {
	}

	public void mouseEntered(MouseEvent e) {
	}

	public void mouseExited(MouseEvent e) {
	}

	public Configurations getCONFIG() {
		return CONFIG;
	}
	
	
}
