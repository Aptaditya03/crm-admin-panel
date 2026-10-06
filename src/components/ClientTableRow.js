import React, { memo, useState, useCallback, useMemo } from 'react';

/**
 * Memoized Client Table Row Component
 * Only re-renders when its specific data changes, not when other rows change
 */
const ClientTableRow = memo(function ClientTableRow({
  client,
  isSelected,
  onSelectClient,
  onOpenModal,
  onAddClientFromTemplate,
  onWhatsAppChat,
  abbreviateBusiness,
  abbreviateVertical,
  abbreviateState,
  abbreviateCountry,
  renderTooltip,
  renderAbbreviationTooltip
}) {
  const [hoveredCell, setHoveredCell] = useState({ column: null });

  // Memoize contact and comments extraction
  const { contact, allComments, latestComment } = useMemo(() => {
    const contactDetails = client.ContactPersonDetails || {};
    const contactKey = Object.keys(contactDetails).find(key => key !== 'comment');
    const contact = contactKey ? contactDetails[contactKey] : {};
    const commentsNode = contactDetails.comment || {};
    const allComments = Object.values(commentsNode)
      .flatMap(firstLevel => Object.values(firstLevel))
      .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
    const latestComment = allComments.length > 0 ? allComments[0] : null;
    
    return { contact, allComments, latestComment };
  }, [client.ContactPersonDetails]);

  // Memoized handlers
  const handleSelect = useCallback(() => {
    onSelectClient(client);
  }, [client, onSelectClient]);

  const handleAddComment = useCallback(() => {
    onOpenModal('addComment', client);
  }, [client, onOpenModal]);

  const handleSetMeeting = useCallback(() => {
    onOpenModal('setMeeting', client);
  }, [client, onOpenModal]);

  const handleAddFromTemplate = useCallback(() => {
    onAddClientFromTemplate(client);
  }, [client, onAddClientFromTemplate]);

  const handleWhatsApp = useCallback(() => {
    onWhatsAppChat(client, contact);
  }, [client, contact, onWhatsAppChat]);

  const handleMouseEnter = useCallback((column) => {
    setHoveredCell({ column });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredCell({ column: null });
  }, []);

  return (
    <tr className={isSelected ? 'selected-row' : ''}>
      <td style={{ width: '2%', padding: '4px' }}>
        <div className="form-check">
          <input 
            type="checkbox" 
            className="form-check-input"
            checked={isSelected} 
            onChange={handleSelect}
          />
        </div>
      </td>
      
      {/* Business Column */}
      <td 
        style={{ width: '6%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px', position: 'relative', cursor: 'help' }}
        onMouseEnter={() => handleMouseEnter('business')}
        onMouseLeave={handleMouseLeave}
      >
        {abbreviateBusiness(client.businessName)}
        {hoveredCell.column === 'business' && client.businessName && 
          renderAbbreviationTooltip(abbreviateBusiness(client.businessName), client.businessName)}
      </td>
      
      {/* Vertical Column */}
      <td 
        style={{ width: '6%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px', position: 'relative', cursor: 'help' }}
        onMouseEnter={() => handleMouseEnter('vertical')}
        onMouseLeave={handleMouseLeave}
      >
        {abbreviateVertical(client.industryType)}
        {hoveredCell.column === 'vertical' && client.industryType && 
          renderAbbreviationTooltip(abbreviateVertical(client.industryType), client.industryType)}
      </td>
      
      <td style={{ width: '14%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px' }}>
        {client.clientName || 'N/A'}
      </td>
      
      {/* Country Column */}
      <td 
        style={{ width: '4%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px', position: 'relative', cursor: 'help' }}
        onMouseEnter={() => handleMouseEnter('country')}
        onMouseLeave={handleMouseLeave}
      >
        {abbreviateCountry(client.country)}
        {hoveredCell.column === 'country' && client.country && 
          renderAbbreviationTooltip(abbreviateCountry(client.country), client.country)}
      </td>
      
      {/* State Column */}
      <td 
        style={{ width: '4%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px', position: 'relative', cursor: 'help' }}
        onMouseEnter={() => handleMouseEnter('state')}
        onMouseLeave={handleMouseLeave}
      >
        {abbreviateState(client.state)}
        {hoveredCell.column === 'state' && client.state && 
          renderAbbreviationTooltip(abbreviateState(client.state), client.state)}
      </td>
      
      <td style={{ width: '6%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px' }}>
        {client.city || 'N/A'}
      </td>
      <td style={{ width: '8%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px' }}>
        {contact.contactPerson || 'N/A'}
      </td>
      <td style={{ width: '8%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px' }}>
        {contact.designation || 'N/A'}
      </td>
      <td style={{ width: '8%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px' }}>
        {contact.phoneNumber || 'N/A'}
      </td>
      <td style={{ width: '10%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px' }}>
        {contact.emailId || 'N/A'}
      </td>
      
      {/* Latest Date Column */}
      <td 
        style={{ 
          width: '10%', 
          wordWrap: 'break-word', 
          fontSize: '0.75rem', 
          padding: '4px',
          position: 'relative',
          cursor: allComments.length > 1 ? 'pointer' : 'default',
          backgroundColor: allComments.length > 1 ? '#f8f9fa' : 'transparent'
        }}
        onMouseEnter={() => allComments.length > 1 && handleMouseEnter('date')}
        onMouseLeave={handleMouseLeave}
      >
        {latestComment ? (
          <div>
            <div className="fw-semibold">{new Date(latestComment.createdDate).toLocaleDateString()}</div>
            <div style={{ fontSize: '0.65rem', color: '#666' }}>
              {new Date(latestComment.createdDate).toLocaleTimeString()}
            </div>
            {allComments.length > 1 && (
              <small className="text-primary">
                <i className="fas fa-layer-group me-1"></i>
                +{allComments.length - 1} more
              </small>
            )}
          </div>
        ) : 'No dates'}
        
        {hoveredCell.column === 'date' && renderTooltip(allComments, 'date')}
      </td>

      {/* Latest Discussion Column */}
      <td 
        style={{ 
          width: '12%', 
          wordWrap: 'break-word', 
          fontSize: '0.75rem', 
          padding: '4px',
          position: 'relative',
          cursor: allComments.length > 1 ? 'pointer' : 'default',
          backgroundColor: allComments.length > 1 ? '#f8f9fa' : 'transparent'
        }}
        onMouseEnter={() => allComments.length > 1 && handleMouseEnter('discussion')}
        onMouseLeave={handleMouseLeave}
      >
        {latestComment ? (
          <div>
            <div style={{ 
              maxHeight: '35px', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: '1.2'
            }}>
              {latestComment.commentmsg}
            </div>
            {allComments.length > 1 && (
              <small className="text-primary">
                <i className="fas fa-comments me-1"></i>
                +{allComments.length - 1} more
              </small>
            )}
          </div>
        ) : 'No discussions'}
        
        {hoveredCell.column === 'discussion' && renderTooltip(allComments, 'discussion')}
      </td>

      {/* Actions Column */}
      <td className="text-center p-2">
        <div 
          className="actions-grid" 
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: '3px',
            width: '80px',
            margin: '0 auto'
          }}
        >
          <button 
            className="btn btn-sm btn-outline-info" 
            onClick={handleAddComment} 
            title="Add Comment"
            style={{ padding: '4px', fontSize: '11px', borderRadius: '4px', minHeight: '28px' }}
          >
            <i className="fas fa-comment"></i>
          </button>
          
          <button 
            className="btn btn-sm btn-light" 
            onClick={handleAddFromTemplate} 
            title="Add New Client from Template"
            style={{ padding: '4px', fontSize: '11px', borderRadius: '4px', minHeight: '28px' }}
          >
            <i className="fas fa-plus-square text-success"></i>
          </button>
          
          <button 
            className="btn btn-sm btn-outline-primary" 
            onClick={handleSetMeeting} 
            title="Set Meeting"
            style={{ padding: '4px', fontSize: '11px', borderRadius: '4px', minHeight: '28px' }}
          >
            <i className="fas fa-calendar-alt"></i>
          </button>
          
          <button 
            className="btn btn-sm btn-success" 
            onClick={handleWhatsApp} 
            title="WhatsApp"
            style={{ padding: '4px', fontSize: '11px', borderRadius: '4px', minHeight: '28px' }}
          >
            <i className="fab fa-whatsapp"></i>
          </button>
        </div>
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo - only re-render if these specific props change
  return (
    prevProps.client === nextProps.client &&
    prevProps.isSelected === nextProps.isSelected
  );
});

export default ClientTableRow;
