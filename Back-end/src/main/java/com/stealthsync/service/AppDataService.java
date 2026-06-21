package com.stealthsync.service;

import com.stealthsync.model.dto.CreateTicketRequest;
import com.stealthsync.model.dto.DashboardStatsResponse;
import com.stealthsync.model.dto.UserAccountDTO;
import com.stealthsync.model.entity.CloudStorageLink;
import com.stealthsync.model.entity.EncryptedFileRecord;
import com.stealthsync.model.entity.Plan;
import com.stealthsync.model.entity.Subscription;
import com.stealthsync.model.entity.Ticket;
import com.stealthsync.model.entity.TicketResponse;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.CloudStorageLinkRepository;
import com.stealthsync.repository.EncryptedFileRecordRepository;
import com.stealthsync.repository.PlanRepository;
import com.stealthsync.repository.SubscriptionRepository;
import com.stealthsync.repository.TicketRepository;
import com.stealthsync.repository.TicketResponseRepository;
import com.stealthsync.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
/**
 * Central application service for account, plan, ticket, subscription, cloud-link, and file workflows.
 * Controllers delegate here so validation and database updates stay consistent across API endpoints.
 */
public class AppDataService {

    private static final String DEFAULT_CUSTOMER_EMAIL = "user@stealthsync.com";
    private static final Set<String> SUPPORTED_CLOUD_PROVIDERS = Set.of("google_drive", "dropbox", "onedrive");
    private static final int FREE_TIER_CLOUD_PROVIDER_LIMIT = 1;
    private static final int PREMIUM_CLOUD_PROVIDER_LIMIT = 5;

    private final UserAccountRepository userAccountRepository;
    private final PlanRepository planRepository;
    private final TicketRepository ticketRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final CloudStorageLinkRepository cloudStorageLinkRepository;
    private final EncryptedFileRecordRepository encryptedFileRecordRepository;
    private final TicketResponseRepository ticketResponseRepository;
    private final PasswordEncoder passwordEncoder;

    public Optional<UserAccount> authenticate(String usernameOrEmail, String password) {
        String login = usernameOrEmail == null ? "" : usernameOrEmail.trim();
        return userAccountRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(login, login)
                .filter(user -> !user.isSuspended())
                .filter(user -> passwordMatches(user, password));
    }

    @Transactional
    public UserAccount registerCustomer(String username, String email, String password) {
        if (isBlank(username) || isBlank(email)) {
            throw new IllegalArgumentException("Username and email are required.");
        }
        if (userAccountRepository.existsByUsernameIgnoreCase(username.trim())
                || userAccountRepository.existsByEmailIgnoreCase(email.trim())) {
            throw new IllegalArgumentException("Username or Email already exists.");
        }

        UserAccount user = new UserAccount(null, username.trim(), email.trim(), "customer", false, false, null);
        user.setPasswordHash(passwordEncoder.encode(isBlank(password) ? "User@1234" : password));
        return userAccountRepository.save(user);
    }

    @Transactional
    public UserAccount registerCustomer(String username, String email) {
        return registerCustomer(username, email, "User@1234");
    }

    public DashboardStatsResponse dashboardStats() {
        List<UserAccount> users = userAccountRepository.findAll();
        List<Ticket> tickets = ticketRepository.findAll();
        return DashboardStatsResponse.builder()
                .totalUsers(users.size())
                .premiumUsers((int) users.stream().filter(UserAccount::isSubscribed).count())
                .inactiveUsers((int) users.stream().filter(UserAccount::isSuspended).count())
                .openTickets((int) tickets.stream().filter(ticket -> "open".equalsIgnoreCase(ticket.getTicketStatus())).count())
                .build();
    }

    public List<UserAccountDTO> listUsers(String search) {
        String keyword = normalize(search);
        return userAccountRepository.findAll(Sort.by("userID")).stream()
                .filter(user -> keyword.isBlank()
                        || user.getUsername().toLowerCase(Locale.ROOT).contains(keyword)
                        || user.getEmail().toLowerCase(Locale.ROOT).contains(keyword))
                .map(this::toUserAccountDTO)
                .toList();
    }

    public Optional<UserAccount> findUser(Long userID) {
        return userID == null ? Optional.empty() : userAccountRepository.findById(userID);
    }

    @Transactional
    public Optional<UserAccountDTO> updateUserProfile(Long userID, String username, String email) {
        return findUser(userID).map(user -> {
            if (!isBlank(username)) {
                user.setUsername(username.trim());
            }
            if (!isBlank(email)) {
                user.setEmail(email.trim());
            }
            return toUserAccountDTO(userAccountRepository.save(user));
        });
    }

    @Transactional
    public Optional<UserAccountDTO> setUserSuspended(Long userID, boolean suspended) {
        return findUser(userID).map(user -> {
            user.setSuspended(suspended);
            return toUserAccountDTO(userAccountRepository.save(user));
        });
    }

    public List<Plan> listPlans() {
        return planRepository.findAll(Sort.by("planID"));
    }

    @Transactional
    public Plan createPlan(Plan plan) {
        if (isBlank(plan.getPlanStatus())) {
            plan.setPlanStatus("active");
        }
        return planRepository.save(plan);
    }

    @Transactional
    public Optional<Plan> updatePlan(Long planID, Plan updatedPlan) {
        return findPlan(planID).map(existing -> {
            existing.setPlanTitle(updatedPlan.getPlanTitle());
            existing.setPlanPrice(updatedPlan.getPlanPrice());
            existing.setPlanDescription(updatedPlan.getPlanDescription());
            existing.setPlanStatus(updatedPlan.getPlanStatus());
            existing.setEncMethod(updatedPlan.getEncMethod());
            return planRepository.save(existing);
        });
    }

    @Transactional
    public Optional<Plan> updatePlanStatus(Long planID, String status) {
        return findPlan(planID).map(plan -> {
            plan.setPlanStatus(isBlank(status) ? "active" : status);
            return planRepository.save(plan);
        });
    }

    public Optional<Plan> findPlan(Long planID) {
        return planID == null ? Optional.empty() : planRepository.findById(planID);
    }

    public List<Ticket> listTickets(String search, String status, String personInCharge, String requester) {
        String keyword = normalize(search);
        return ticketRepository.findAll(Sort.by("ticketID")).stream()
                .filter(ticket -> keyword.isBlank()
                        || ticket.getTicketTitle().toLowerCase(Locale.ROOT).contains(keyword)
                        || ticket.getTicketDescription().toLowerCase(Locale.ROOT).contains(keyword))
                .filter(ticket -> isBlank(status) || ticket.getTicketStatus().equalsIgnoreCase(status))
                .filter(ticket -> isBlank(requester)
                        || ticket.getTicketRequester().getUserID().toString().equals(requester))
                .filter(ticket -> isBlank(personInCharge)
                        || ("unassigned".equals(personInCharge) && ticket.getPersonInCharge() == null)
                        || (ticket.getPersonInCharge() != null
                        && ticket.getPersonInCharge().getUserID().toString().equals(personInCharge)))
                .toList();
    }

    public List<Ticket> listMyTickets() {
        return defaultCustomer()
                .map(customer -> ticketRepository.findAll(Sort.by("ticketID")).stream()
                        .filter(ticket -> ticket.getTicketRequester().getUserID().equals(customer.getUserID()))
                        .toList())
                .orElseGet(List::of);
    }

    @Transactional
    public Ticket createTicket(CreateTicketRequest request) {
        UserAccount requester = findUser(request.getTicketRequesterID())
                .or(() -> defaultCustomer())
                .orElseThrow(() -> new IllegalArgumentException("Ticket requester does not exist."));
        Ticket ticket = new Ticket(
                null,
                request.getTicketTitle(),
                request.getTicketDescription(),
                "open",
                requester,
                null,
                new ArrayList<>()
        );
        return ticketRepository.save(ticket);
    }

    @Transactional
    /** Persists one normalized admin/customer message and attaches it to its parent ticket. */
    public Optional<TicketResponse> addTicketResponse(Long ticketID, String message, String senderRole) {
        if (isBlank(message)) {
            throw new IllegalArgumentException("Message is required.");
        }
        String normalizedSenderRole = normalizeSenderRole(senderRole);

        return findTicket(ticketID).map(ticket -> ticketResponseRepository.save(new TicketResponse(
                null,
                message.trim(),
                normalizedSenderRole,
                Instant.now(),
                ticket
        )));
    }

    @Transactional
    public Optional<Ticket> assignTicket(Long ticketID, Long personInChargeID) {
        UserAccount assignee = findUser(personInChargeID)
                .or(() -> userAccountRepository.findByUsernameIgnoreCase("admin"))
                .orElseThrow(() -> new IllegalArgumentException("Assignee does not exist."));
        return findTicket(ticketID).map(ticket -> {
            ticket.setPersonInCharge(assignee);
            return ticketRepository.save(ticket);
        });
    }

    @Transactional
    public Optional<Ticket> closeTicket(Long ticketID) {
        return findTicket(ticketID).map(ticket -> {
            ticket.setTicketStatus("closed");
            return ticketRepository.save(ticket);
        });
    }

    public List<Subscription> listSubscriptions(String search) {
        String keyword = normalize(search);
        return subscriptionRepository.findAll(Sort.by("subscriptionID")).stream()
                .filter(subscription -> keyword.isBlank()
                        || subscription.getSubscriber().getUsername().toLowerCase(Locale.ROOT).contains(keyword)
                        || subscription.getSubscriber().getEmail().toLowerCase(Locale.ROOT).contains(keyword)
                        || subscription.getPlan().getPlanTitle().toLowerCase(Locale.ROOT).contains(keyword))
                .toList();
    }

    public Optional<Subscription> findSubscription(Long subscriptionID) {
        return subscriptionID == null ? Optional.empty() : subscriptionRepository.findById(subscriptionID);
    }

    @Transactional
    /**
     * Applies the course-project demo purchase immediately.
     * Paid plans create/update a 30-day subscription; a free plan removes the current subscription.
     */
    public UserAccountDTO purchasePlan(Long userID, Long planID) {
        if (userID == null || planID == null) {
            throw new IllegalArgumentException("User ID and plan ID are required.");
        }

        UserAccount customer = findUser(userID)
                .orElseThrow(() -> new IllegalArgumentException("Customer does not exist."));
        if (!"customer".equalsIgnoreCase(customer.getRole())) {
            throw new IllegalArgumentException("Only customer accounts can purchase plans.");
        }

        Plan plan = findPlan(planID)
                .orElseThrow(() -> new IllegalArgumentException("Plan does not exist."));
        if (!"active".equalsIgnoreCase(plan.getPlanStatus())) {
            throw new IllegalArgumentException("Selected plan is not active.");
        }

        Optional<Subscription> currentSubscription = findCurrentSubscription(customer);
        if (plan.getPlanPrice() <= 0) {
            currentSubscription.ifPresent(subscription -> {
                subscription.setSubcriptionStatus("cancelled");
                subscriptionRepository.save(subscription);
            });
            customer.setSubscribed(false);
            customer.setSubscription(null);
            return toUserAccountDTO(userAccountRepository.save(customer));
        }

        LocalDate startDate = LocalDate.now();
        Subscription subscription = currentSubscription.orElseGet(() -> new Subscription(
                null,
                plan,
                customer,
                "active",
                startDate,
                startDate.plusDays(30)
        ));
        subscription.setPlan(plan);
        subscription.setSubscriber(customer);
        subscription.setSubcriptionStatus("active");
        subscription.setSubcriptionStartDate(startDate);
        subscription.setSubscriptionEndDate(startDate.plusDays(30));

        Subscription savedSubscription = subscriptionRepository.save(subscription);
        customer.setSubscribed(true);
        customer.setSubscription(savedSubscription.getSubscriptionID());
        return toUserAccountDTO(userAccountRepository.save(customer));
    }

    @Transactional
    public Optional<Subscription> cancelSubscription(Long subscriptionID) {
        return findSubscription(subscriptionID).map(subscription -> {
            subscription.setSubcriptionStatus("cancelled");
            UserAccount subscriber = subscription.getSubscriber();
            subscriber.setSubscribed(false);
            subscriber.setSubscription(null);
            userAccountRepository.save(subscriber);
            return subscriptionRepository.save(subscription);
        });
    }

    @Transactional
    public Optional<Subscription> updateSubscription(Long subscriptionID, Subscription updated) {
        return findSubscription(subscriptionID).map(existing -> {
            Long planID = updated.getPlan() == null ? null : updated.getPlan().getPlanID();
            findPlan(planID).ifPresent(existing::setPlan);
            if (!isBlank(updated.getSubcriptionStatus())) {
                existing.setSubcriptionStatus(updated.getSubcriptionStatus());
            }
            if (updated.getSubcriptionStartDate() != null) {
                existing.setSubcriptionStartDate(updated.getSubcriptionStartDate());
            }
            if (updated.getSubscriptionEndDate() != null) {
                existing.setSubscriptionEndDate(updated.getSubscriptionEndDate());
            }

            Subscription saved = subscriptionRepository.save(existing);
            boolean active = "active".equalsIgnoreCase(saved.getSubcriptionStatus());
            UserAccount subscriber = saved.getSubscriber();
            subscriber.setSubscribed(active);
            subscriber.setSubscription(active ? saved.getSubscriptionID() : null);
            userAccountRepository.save(subscriber);
            return saved;
        });
    }

    public List<CloudStorageLink> listCloudStorageLinks() {
        return cloudStorageLinkRepository.findAll(Sort.by("linkID"));
    }

    public List<CloudStorageLink> listCloudStorageLinks(Long ownerID) {
        if (ownerID == null) {
            return listCloudStorageLinks();
        }
        return cloudStorageLinkRepository.findByOwnerID(ownerID).stream()
                .sorted((left, right) -> left.getLinkID().compareTo(right.getLinkID()))
                .toList();
    }

    @Transactional
    public Optional<CloudStorageLink> setActiveCloudStorageLink(Long linkID) {
        Optional<CloudStorageLink> selected = findCloudStorageLink(linkID);
        selected.ifPresent(link -> {
            List<CloudStorageLink> links = cloudStorageLinkRepository.findByOwnerID(link.getOwnerID());
            links.forEach(existing -> existing.setActive(existing.getLinkID().equals(linkID)));
            cloudStorageLinkRepository.saveAll(links);
        });
        return selected;
    }

    @Transactional
    public Optional<CloudStorageLink> deactivateCloudStorageLink(Long linkID) {
        return findCloudStorageLink(linkID).map(link -> {
            link.setActive(false);
            link.setStatus("disconnected");
            return cloudStorageLinkRepository.save(link);
        });
    }

    @Transactional
    public boolean removeCloudStorageLink(Long linkID) {
        if (linkID == null || !cloudStorageLinkRepository.existsById(linkID)) {
            return false;
        }
        cloudStorageLinkRepository.deleteById(linkID);
        return true;
    }

    @Transactional
    public Optional<CloudStorageLink> reconnectCloudStorageLink(Long linkID) {
        return findCloudStorageLink(linkID).map(link -> {
            link.setStatus("connected");
            link.setLinkedAt(Instant.now());
            return cloudStorageLinkRepository.save(link);
        });
    }

    @Transactional
    public CloudStorageLink linkCloudProvider(String provider) {
        Long ownerID = defaultCustomer()
                .map(UserAccount::getUserID)
                .orElseThrow(() -> new IllegalArgumentException("Default customer does not exist."));
        return linkCloudProvider(provider, ownerID);
    }

    @Transactional
    public CloudStorageLink linkCloudProvider(String provider, Long ownerID) {
        String normalizedProvider = normalizeCloudProvider(provider);
        return linkCloudProvider(
                normalizedProvider,
                ownerID,
                normalizedProvider.replace("_", ".") + ".user@example.com"
        );
    }

    @Transactional
    /** Links a supported provider after enforcing the free/premium account limit. */
    public CloudStorageLink linkCloudProvider(String provider, Long ownerID, String accountEmail) {
        String normalizedProvider = normalizeCloudProvider(provider);
        UserAccount owner = findUser(ownerID)
                .orElseThrow(() -> new IllegalArgumentException("Cloud storage owner does not exist."));

        return cloudStorageLinkRepository.findByOwnerIDAndProviderIgnoreCase(owner.getUserID(), normalizedProvider)
                .map(link -> {
                    link.setAccountEmail(accountEmail);
                    link.setStatus("connected");
                    link.setLinkedAt(Instant.now());
                    return cloudStorageLinkRepository.save(link);
                })
                .orElseGet(() -> {
                    enforceCloudProviderLimit(owner);
                    boolean firstLink = cloudStorageLinkRepository.findByOwnerID(owner.getUserID()).isEmpty();
                    CloudStorageLink link = new CloudStorageLink(
                            null,
                            normalizedProvider,
                            accountEmail,
                            Instant.now(),
                            "connected",
                            firstLink,
                            owner.getUserID()
                    );
                    return cloudStorageLinkRepository.save(link);
                });
    }

    public Optional<CloudStorageLink> findCloudStorageLink(Long linkID) {
        return linkID == null ? Optional.empty() : cloudStorageLinkRepository.findById(linkID);
    }

    public Set<String> supportedCloudProviders() {
        return SUPPORTED_CLOUD_PROVIDERS;
    }

    public int cloudProviderLimitFor(Long ownerID) {
        return findUser(ownerID)
                .map(user -> user.isSubscribed() ? PREMIUM_CLOUD_PROVIDER_LIMIT : FREE_TIER_CLOUD_PROVIDER_LIMIT)
                .orElse(FREE_TIER_CLOUD_PROVIDER_LIMIT);
    }

    public List<EncryptedFileRecord> listEncryptedFiles() {
        return encryptedFileRecordRepository.findAll(Sort.by(Sort.Direction.DESC, "uploadedAt"));
    }

    public Map<String, Object> cloudStorageUsage() {
        long usedBytes = encryptedFileRecordRepository.findAll().stream()
                .mapToLong(EncryptedFileRecord::getFileSize)
                .sum();
        long totalBytes = 5L * 1024L * 1024L * 1024L;
        return Map.of(
                "usedBytes", usedBytes,
                "totalBytes", totalBytes,
                "availableBytes", Math.max(0, totalBytes - usedBytes),
                "fileCount", encryptedFileRecordRepository.count()
        );
    }

    @Transactional
    public EncryptedFileRecord storeEncryptedFile(String filename, long originalSize, String encMethod, byte[] encryptedContent) {
        long nextKeyID = 1001L + encryptedFileRecordRepository.count();
        EncryptedFileRecord record = new EncryptedFileRecord(
                null,
                filename,
                originalSize,
                fileType(filename),
                Instant.now(),
                encMethod,
                nextKeyID,
                encryptedContent
        );
        return encryptedFileRecordRepository.save(record);
    }

    public Optional<EncryptedFileRecord> findEncryptedFile(Long fileID) {
        return fileID == null ? Optional.empty() : encryptedFileRecordRepository.findById(fileID);
    }

    /** Deletes one local file record without treating an unknown ID as success. */
    @Transactional
    public boolean deleteEncryptedFile(Long fileID) {
        if (fileID == null || !encryptedFileRecordRepository.existsById(fileID)) {
            return false;
        }
        encryptedFileRecordRepository.deleteById(fileID);
        return true;
    }

    private Optional<Ticket> findTicket(Long ticketID) {
        return ticketID == null ? Optional.empty() : ticketRepository.findById(ticketID);
    }


    private Optional<UserAccount> defaultCustomer() {
        return userAccountRepository.findByEmailIgnoreCase(DEFAULT_CUSTOMER_EMAIL)
                .or(() -> userAccountRepository.findAll().stream()
                        .filter(user -> "customer".equalsIgnoreCase(user.getRole()))
                        .findFirst());
    }

    private Optional<Subscription> findCurrentSubscription(UserAccount customer) {
        if (customer == null || customer.getUserID() == null) {
            return Optional.empty();
        }
        Optional<Subscription> linkedSubscription = customer.getSubscription() == null
                ? Optional.empty()
                : findSubscription(customer.getSubscription());
        return linkedSubscription.or(() ->
                subscriptionRepository.findFirstBySubscriber_UserIDOrderBySubscriptionIDDesc(customer.getUserID()));
    }

    private UserAccountDTO toUserAccountDTO(UserAccount user) {
        UserAccountDTO dto = new UserAccountDTO();
        dto.setUserID(user.getUserID());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole());
        dto.setSubscribed(user.isSubscribed());
        dto.setSuspended(user.isSuspended());
        if (user.getSubscription() == null) {
            dto.setSubscription(null);
        } else {
            findSubscription(user.getSubscription()).ifPresent(dto::setSubscription);
        }
        return dto;
    }

    private boolean passwordMatches(UserAccount user, String rawPassword) {
        if (isBlank(rawPassword)) {
            return false;
        }
        if (!isBlank(user.getPasswordHash())) {
            return passwordEncoder.matches(rawPassword, user.getPasswordHash());
        }
        if ("admin".equalsIgnoreCase(user.getRole())) {
            return "Admin@123".equals(rawPassword);
        }
        if ("customer".equalsIgnoreCase(user.getRole())) {
            return "User@1234".equals(rawPassword);
        }
        return false;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeCloudProvider(String provider) {
        String normalized = normalize(provider);
        if (!SUPPORTED_CLOUD_PROVIDERS.contains(normalized)) {
            throw new IllegalArgumentException("Unsupported cloud storage provider: " + provider);
        }
        return normalized;
    }

    // Count distinct providers so reconnecting the same provider does not consume another slot.
    private void enforceCloudProviderLimit(UserAccount owner) {
        int limit = owner.isSubscribed() ? PREMIUM_CLOUD_PROVIDER_LIMIT : FREE_TIER_CLOUD_PROVIDER_LIMIT;
        int linkedProviderCount = (int) cloudStorageLinkRepository.findByOwnerID(owner.getUserID()).stream()
                .map(CloudStorageLink::getProvider)
                .map(this::normalize)
                .distinct()
                .count();
        if (linkedProviderCount >= limit) {
            throw new IllegalArgumentException("Your plan can link up to " + limit + " cloud storage provider"
                    + (limit == 1 ? "." : "s."));
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String normalizeSenderRole(String senderRole) {
        String normalized = normalize(senderRole);
        if (!"admin".equals(normalized) && !"customer".equals(normalized)) {
            throw new IllegalArgumentException("senderRole must be either 'admin' or 'customer'.");
        }
        return normalized;
    }

    private String fileType(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "file";
        }
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }
}
